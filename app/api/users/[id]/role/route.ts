import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/middleware/auth";
import { updateRoleSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await checkAdmin();
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, name: true, role: true, isAdmin: true },
  });

  return NextResponse.json(user);
}
