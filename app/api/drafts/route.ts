import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/middleware/auth";
import { listArticlesSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const { error } = await checkRole("EDITOR");
  if (error) return error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = listArticlesSchema.safeParse(params);

  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", "Invalid query parameters");
  }

  const { page, limit } = parsed.data;

  const where = { status: "DRAFT" as const };

  const [data, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
        credits: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
