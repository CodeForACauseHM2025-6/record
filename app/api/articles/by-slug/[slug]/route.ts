import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";

// Public-safe projection: drop email, isAdmin, googleImage, emailVerified, createdAt, updatedAt.
// This route is unauthenticated; callers must not be able to enumerate author PII.
const publicUserSelect = {
  id: true,
  name: true,
  image: true,
  role: true,
  displayTitle: true,
  encryptedDek: true,
  dekKekVersion: true,
  nameCiphertext: true,
  imageCiphertext: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, group: { status: "PUBLISHED" } },
    include: {
      createdBy: { select: publicUserSelect },
      credits: {
        include: { user: { select: publicUserSelect } },
      },
      images: {
        orderBy: { order: "asc" },
      },
      group: { select: { publishedAt: true, volumeNumber: true, issueNumber: true, status: true } },
    },
  });

  if (!article) {
    return errorResponse("NOT_FOUND", "Article not found", 404);
  }

  return NextResponse.json(article);
}
