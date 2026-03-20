import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Article not found", 404);
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return NextResponse.json(article);
}
