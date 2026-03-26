import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News",
  FEATURES: "Features",
  OPINIONS: "Opinions",
  A_AND_E: "A&E",
  LIONS_DEN: "Lion\u2019s Den",
  THE_ROUNDTABLE: "The Roundtable",
};

const SECTION_HREFS: Record<string, string> = {
  NEWS: "/section/news",
  FEATURES: "/section/features",
  OPINIONS: "/section/opinions",
  A_AND_E: "/section/a-and-e",
  LIONS_DEN: "/section/lions-den",
  THE_ROUNDTABLE: "/section/the-roundtable",
};

interface ArticleResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  section: string;
  publishedAt: Date | null;
  createdBy: { id: string; name: string };
  credits: { creditRole: string; user: { id: string; name: string } }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getExcerpt(article: ArticleResult): string {
  if (article.excerpt) return article.excerpt;
  const plain = stripHtml(article.body);
  if (plain.length <= 200) return plain;
  return plain.slice(0, 200).replace(/\s+\S*$/, "") + "\u2026";
}

function getAuthorName(article: ArticleResult): { name: string; id: string } {
  if (article.credits.length > 0) {
    return { name: article.credits[0].user.name, id: article.credits[0].user.id };
  }
  return { name: article.createdBy.name, id: article.createdBy.id };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let articles: ArticleResult[] = [];
  if (query.length > 0) {
    articles = (await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
      include: {
        createdBy: true,
        credits: { include: { user: true } },
      },
    })) as unknown as ArticleResult[];
  }

  return (
    <div className="min-h-screen bg-white font-body">
      <SubpageHeader pageLabel="Search" />

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-10 pb-16">
        {/* Search heading */}
        <h2 className="reveal reveal-delay-1 font-headline text-[28px] sm:text-[36px] font-bold leading-tight tracking-wide">
          Search the Record
        </h2>
        <p className="reveal reveal-delay-1 font-headline text-[14px] text-caption mt-1 tracking-wide">
          Browse every digitized issue of The Record
        </p>

        {/* Search input */}
        <form action="/search" method="GET" className="reveal reveal-delay-2 mt-6">
          <div className="flex border-2 border-ink">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by headline, author, or keyword..."
              autoFocus
              className="flex-1 px-5 py-4 font-headline text-[17px] sm:text-[18px] tracking-wide placeholder:text-caption/40 outline-none bg-transparent"
            />
            <button
              type="submit"
              className="px-6 bg-ink text-white font-headline font-bold text-[15px] tracking-[0.06em] transition-colors duration-200 hover:bg-maroon shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Rule */}
        <div className="reveal reveal-delay-3 mt-8 h-[2px] bg-rule" />

        {/* Results */}
        {query.length > 0 ? (
          <>
            <p className="reveal reveal-delay-3 font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mt-6 mb-6">
              {articles.length} {articles.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
            </p>

            {articles.length > 0 ? (
              <div className="divide-y divide-neutral-200">
                {articles.map((article, i) => {
                  const author = getAuthorName(article);
                  return (
                    <article
                      key={article.id}
                      className={`reveal py-6 first:pt-0 ${
                        i < 6 ? `reveal-delay-${Math.min(i + 4, 7)}` : ""
                      }`}
                    >
                      {/* Section label */}
                      <Link
                        href={SECTION_HREFS[article.section] ?? "#"}
                        className="font-headline text-maroon italic text-[14px] tracking-wide"
                      >
                        {SECTION_LABELS[article.section] ?? article.section}
                      </Link>

                      {/* Title */}
                      <h3 className="font-headline text-[20px] sm:text-[22px] font-bold leading-snug mt-1">
                        <Link
                          href={`/article/${article.slug}`}
                          className="hover:text-maroon transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="text-[15px] leading-[1.6] text-caption mt-2">
                        {getExcerpt(article)}
                      </p>

                      {/* Author + Date */}
                      <div className="mt-3 font-headline text-[14px]">
                        <Link
                          href={`/profile/${author.id}`}
                          className="text-maroon font-semibold hover:underline"
                        >
                          {author.name}
                        </Link>
                        {article.publishedAt && (
                          <span className="text-caption ml-2">
                            &middot; {formatDate(article.publishedAt)}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* No results */
              <div className="text-center py-16">
                <p className="font-headline text-[22px] text-caption/50 italic">
                  No articles found.
                </p>
                <p className="font-headline text-[14px] text-caption/40 mt-2 tracking-wide">
                  Try a different keyword or browse by section.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty state — no query yet */
          <div className="reveal reveal-delay-3 text-center py-20">
            <div className="text-caption/20 mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                <line
                  x1="16.5" y1="16.5" x2="22" y2="22"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="font-headline italic text-[18px] text-caption/40">
              Enter a query to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
