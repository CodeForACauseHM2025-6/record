import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { errorResponse } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const article = await prisma.article.findFirst({
    where: { id, status: "DRAFT" },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      credits: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      images: { orderBy: { order: "asc" } },
    },
  });

  if (!article) {
    return errorResponse("NOT_FOUND", "Draft not found", 404);
  }

  return NextResponse.json(article);
}
