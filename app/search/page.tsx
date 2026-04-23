import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import { SearchClient } from "@/app/search/search-client";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let initialResults: {
    id: string;
    title: string;
    slug: string;
    body: string;
    section: string;
    publishedAt: string | null;
    authorName: string;
    authorId: string;
  }[] = [];

  if (query.length > 0) {
    const articles = await prisma.article.findMany({
      where: {
        group: { status: "PUBLISHED" },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { group: { publishedAt: "desc" } },
      take: 30,
      include: {
        createdBy: { select: { id: true, name: true } },
        credits: { include: { user: { select: { id: true, name: true } } } },
        group: { select: { publishedAt: true } },
      },
    });

    initialResults = articles.map((a: (typeof articles)[number]) => {
      const author = a.credits.length > 0
        ? { name: a.credits[0].user.name, id: a.credits[0].user.id }
        : { name: a.createdBy.name, id: a.createdBy.id };
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        body: a.body,
        section: a.section,
        publishedAt: a.group?.publishedAt?.toISOString() ?? null,
        authorName: author.name,
        authorId: author.id,
      };
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Search" />

      <div className="w-full max-w-[900px] mx-auto px-4 sm:px-8 pt-10 pb-16">
        <h2 className="reveal reveal-delay-1 font-headline text-[28px] sm:text-[36px] font-bold leading-tight tracking-wide">
          Search the Record
        </h2>
        <p className="reveal reveal-delay-1 font-headline text-[14px] text-caption mt-1 tracking-wide">
          Browse every digitized issue of The Record
        </p>

        <SearchClient initialResults={initialResults} initialQuery={query} />
      </div>
      <Footer />
    </div>
  );
}
