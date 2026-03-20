import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { createArticleSchema, listArticlesSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/slugify";
import { sanitizeHtml } from "@/lib/sanitize";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawParams = {
    section: searchParams.get("section") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  };

  const parsed = listArticlesSchema.safeParse(rawParams);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query params", 400);
  }

  const { section, page, limit, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (section) where.section = section;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: "desc" },
      include: {
        createdBy: true,
        credits: { include: { user: true } },
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await checkRole("EDITOR");
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { title, body: articleBody, excerpt, featuredImage, section, credits, images } = parsed.data;

  const slug = await generateUniqueSlug(title);
  const sanitizedBody = sanitizeHtml(articleBody);

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      body: sanitizedBody,
      excerpt,
      featuredImage,
      section,
      createdById: session!.user.id,
      credits: credits
        ? { create: credits }
        : undefined,
      images: images
        ? { create: images }
        : undefined,
    },
    include: {
      createdBy: true,
      credits: { include: { user: true } },
      images: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(article, { status: 201 });
}
