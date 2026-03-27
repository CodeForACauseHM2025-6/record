import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ articles: [] });
  }

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 30,
    include: {
      createdBy: { select: { id: true, name: true } },
      credits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  const results = articles.map((a) => {
    const author = a.credits.length > 0
      ? { name: a.credits[0].user.name, id: a.credits[0].user.id }
      : { name: a.createdBy.name, id: a.createdBy.id };
    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      body: a.body,
      section: a.section,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      authorName: author.name,
      authorId: author.id,
    };
  });

  return NextResponse.json({ articles: results });
}
