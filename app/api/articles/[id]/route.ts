import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { updateArticleSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { errorResponse } from "@/lib/errors";

const articleInclude = {
  createdBy: true,
  credits: { include: { user: true } },
  images: { orderBy: { order: "asc" as const } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: articleInclude,
  });

  if (!article) {
    return errorResponse("NOT_FOUND", "Article not found", 404);
  }

  return NextResponse.json(article);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Article not found", 404);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = updateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { title, body: articleBody, excerpt, featuredImage, section, credits, images } = parsed.data;

  const sanitizedBody = articleBody !== undefined ? sanitizeHtml(articleBody) : undefined;

  // Replace credits if provided
  if (credits !== undefined) {
    await prisma.articleCredit.deleteMany({ where: { articleId: id } });
  }

  // Replace images if provided
  if (images !== undefined) {
    await prisma.articleImage.deleteMany({ where: { articleId: id } });
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(sanitizedBody !== undefined && { body: sanitizedBody }),
      ...(excerpt !== undefined && { excerpt }),
      ...(featuredImage !== undefined && { featuredImage }),
      ...(section !== undefined && { section }),
      ...(credits !== undefined && { credits: { create: credits } }),
      ...(images !== undefined && { images: { create: images } }),
    },
    include: articleInclude,
  });

  return NextResponse.json(article);
}

export async function DELETE(
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

  await prisma.article.delete({ where: { id } });

  return NextResponse.json({ message: "Article deleted successfully" });
}
