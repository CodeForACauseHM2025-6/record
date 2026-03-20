import { NextRequest, NextResponse } from "next/server";
import { checkRole } from "@/lib/middleware/auth";
import { uploadRequestSchema, deleteImageSchema } from "@/lib/validations";
import { createPresignedUploadUrl, deleteS3Object } from "@/lib/s3";
import { errorResponse } from "@/lib/errors";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const body = await req.json();
  const parsed = uploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const { filename, contentType, contentLength } = parsed.data;
  const ext = filename.split(".").pop();
  const key = `uploads/${randomUUID()}.${ext}`;

  const uploadUrl = await createPresignedUploadUrl(key, contentType, contentLength);

  return NextResponse.json({
    uploadUrl,
    key,
    publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  });
}

export async function DELETE(req: NextRequest) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const body = await req.json();
  const parsed = deleteImageSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", parsed.error.issues[0].message);
  }

  await deleteS3Object(parsed.data.key);

  return NextResponse.json({ message: "Image deleted" });
}
