import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, group: { status: "PUBLISHED" } },
    include: {
      createdBy: true,
      credits: {
        include: { user: true },
      },
      images: {
        orderBy: { order: "asc" },
      },
      group: { select: { publishedAt: true, issueNumber: true, status: true } },
    },
  });

  if (!article) {
    return errorResponse("NOT_FOUND", "Article not found", 404);
  }

  return NextResponse.json(article);
}
