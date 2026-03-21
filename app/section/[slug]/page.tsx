import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@prisma/client";
import { SubpageHeader } from "@/app/subpage-header";

const SLUG_TO_SECTION: Record<string, { label: string; dbKey: string }> = {
  news: { label: "News", dbKey: "NEWS" },
  features: { label: "Features", dbKey: "FEATURES" },
  opinions: { label: "Opinion", dbKey: "OPINIONS" },
  "a-and-e": { label: "A&E", dbKey: "A_AND_E" },
  "lions-den": { label: "Lion\u2019s Den", dbKey: "LIONS_DEN" },
  "the-roundtable": { label: "The Roundtable", dbKey: "THE_ROUNDTABLE" },
};

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  featuredImage: string | null;
  section: string;
  publishedAt: Date | null;
  createdBy: { id: string; name: string };
  credits: { creditRole: string; user: { id: string; name: string } }[];
  images: { url: string; caption: string | null; altText: string }[];
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getExcerptText(article: ArticleData): string {
  if (article.excerpt) return article.excerpt;
  const plain = stripHtml(article.body);
  if (plain.length <= 280) return plain;
  return plain.slice(0, 280).replace(/\s+\S*$/, "") + "\u2026";
}

function getAuthorInfo(article: ArticleData) {
  if (article.credits.length > 0) {
    const primary = article.credits[0];
    return {
      name: primary.user.name,
      role: primary.creditRole,
      id: primary.user.id,
    };
  }
  return {
    name: article.createdBy.name,
    role: "Staff Writer",
    id: article.createdBy.id,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sectionInfo = SLUG_TO_SECTION[slug];

  if (!sectionInfo) {
    notFound();
  }

  const articles = (await prisma.article.findMany({
    where: { status: "PUBLISHED", section: sectionInfo.dbKey as Section },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: {
      createdBy: true,
      credits: { include: { user: true } },
      images: { orderBy: { order: "asc" } },
    },
  })) as unknown as ArticleData[];

  const featured = articles[0] ?? null;
  const rest = articles.slice(1);
  const today = new Date();

  return (
    <div className="min-h-screen bg-white font-body">
      <SubpageHeader pageLabel={sectionInfo.label} />

      {/* ============ SECTION TITLE ============ */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8">
        <h2 className="font-headline text-[32px] sm:text-[40px] font-bold leading-tight tracking-wide">
          {sectionInfo.label}
        </h2>
        <p className="font-headline text-[12px] sm:text-[13px] font-semibold tracking-[0.05em] text-caption mt-1">
          {formatDateLong(today)}
        </p>
        <div className="mt-4 h-[2px] bg-rule" />
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {featured ? (
          <>
            {/* ---------- FEATURED ARTICLE ---------- */}
            <div className="flex flex-col lg:flex-row">
              <article className="lg:flex-[3] lg:pr-10 pb-8 lg:pb-0">
                {/* Headline */}
                <h3 className="font-headline text-[26px] sm:text-[30px] lg:text-[34px] font-bold leading-tight mb-5">
                  <Link
                    href={`/article/${featured.slug}`}
                    className="hover:text-maroon transition-colors"
                  >
                    {featured.title}
                  </Link>
                </h3>

                {/* Excerpt with floated image */}
                <div className="featured-excerpt text-[17px] leading-[1.7]">
                  {featured.featuredImage && (
                    <figure className="sm:float-right sm:ml-6 mb-5 sm:w-[55%] sm:max-w-[420px]">
                      <img
                        src={featured.featuredImage}
                        alt={featured.images[0]?.altText ?? featured.title}
                        className="w-full aspect-[4/3] object-cover bg-neutral-100"
                      />
                      {featured.images[0]?.caption && (
                        <figcaption className="mt-1.5 text-[11px] tracking-[0.06em] flex justify-between text-caption">
                          <span className="uppercase font-semibold">
                            {featured.images[0].caption}
                          </span>
                          {featured.images[0].altText && (
                            <span>{featured.images[0].altText}</span>
                          )}
                        </figcaption>
                      )}
                    </figure>
                  )}
                  <p>{getExcerptText(featured)}</p>
                </div>

                {/* Author + Date */}
                <div className="mt-6 clear-both">
                  <p className="font-headline text-[15px]">
                    <Link
                      href={`/profile/${getAuthorInfo(featured).id}`}
                      className="text-maroon font-bold hover:underline"
                    >
                      {getAuthorInfo(featured).name}
                    </Link>{" "}
                    <span className="italic">
                      {getAuthorInfo(featured).role}
                    </span>
                  </p>
                  {featured.publishedAt && (
                    <p className="text-maroon text-[15px] font-headline font-semibold mt-0.5">
                      {formatDateShort(featured.publishedAt)}
                    </p>
                  )}
                </div>
              </article>

              {/* Vertical Divider + First sidebar articles */}
              {rest.length > 0 && (
                <>
                  <div className="hidden lg:block w-px bg-rule shrink-0" />
                  <aside className="lg:flex-[2] lg:pl-8 border-t border-neutral-300 lg:border-t-0 pt-6 lg:pt-0">
                    <div className="divide-y divide-neutral-300">
                      {rest.slice(0, 4).map((article) => {
                        const author = getAuthorInfo(article);
                        return (
                          <div key={article.id} className="py-4 first:pt-0">
                            <h3 className="font-headline text-[17px] font-bold leading-snug">
                              <Link
                                href={`/article/${article.slug}`}
                                className="hover:text-maroon transition-colors"
                              >
                                {article.title}
                              </Link>
                            </h3>
                            <div className="mt-2 flex items-baseline justify-between gap-3 font-headline text-[14px]">
                              <span>
                                <Link
                                  href={`/profile/${author.id}`}
                                  className="text-maroon hover:underline"
                                >
                                  {author.name}
                                </Link>{" "}
                                <span className="italic">{author.role}</span>
                              </span>
                              {article.publishedAt && (
                                <span className="text-caption text-[13px] shrink-0">
                                  {formatDateShort(article.publishedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </aside>
                </>
              )}
            </div>

            {/* ---------- REMAINING ARTICLES ---------- */}
            {rest.length > 4 && (
              <>
                <div className="mt-10 h-px bg-rule" />
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
                  {rest.slice(4).map((article) => {
                    const author = getAuthorInfo(article);
                    return (
                      <article key={article.id} className="border-t border-neutral-300 pt-5">
                        {article.featuredImage && (
                          <Link href={`/article/${article.slug}`}>
                            <img
                              src={article.featuredImage}
                              alt={article.images[0]?.altText ?? article.title}
                              className="w-full aspect-[3/2] object-cover bg-neutral-100 mb-4"
                            />
                          </Link>
                        )}
                        <h3 className="font-headline text-[18px] font-bold leading-snug">
                          <Link
                            href={`/article/${article.slug}`}
                            className="hover:text-maroon transition-colors"
                          >
                            {article.title}
                          </Link>
                        </h3>
                        <p className="mt-2 text-[15px] leading-[1.6] text-caption">
                          {getExcerptText(article)}
                        </p>
                        <div className="mt-3 font-headline text-[14px]">
                          <Link
                            href={`/profile/${author.id}`}
                            className="text-maroon hover:underline"
                          >
                            {author.name}
                          </Link>{" "}
                          <span className="italic">{author.role}</span>
                          {article.publishedAt && (
                            <span className="text-caption ml-2">
                              &middot; {formatDateShort(article.publishedAt)}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-24">
            <p className="font-headline text-2xl text-neutral-400">
              No articles published in {sectionInfo.label} yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
