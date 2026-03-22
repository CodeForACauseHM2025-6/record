import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccountDropdown } from "@/app/account-dropdown";
import { HamburgerButton } from "@/app/sidebar-menu";

const NAV_SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinion", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

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

export default async function HomePage() {
  const session = await auth();
  const articles = (await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 6,
    include: {
      createdBy: true,
      credits: { include: { user: true } },
      images: { orderBy: { order: "asc" } },
    },
  })) as unknown as ArticleData[];

  const featured = articles[0] ?? null;
  const sidebar = articles.slice(1, 6);
  const latestDate = featured?.publishedAt ?? new Date();

  return (
    <div className="min-h-screen bg-white font-body">
      {/* ============ HEADER ============ */}
      <header className="px-4 sm:px-8 pt-4 pb-2">
        <div className="max-w-[1200px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left nav */}
          <div className="flex items-center gap-4 sm:gap-5 font-headline text-base">
            <HamburgerButton />
          </div>

          {/* Center: Masthead */}
          <div className="text-center">
            <Link href="/">
              <h1 className="font-masthead text-[36px] sm:text-[48px] lg:text-[54px] leading-none tracking-tight">
                The Record
              </h1>
            </Link>
            <p className="font-body text-[11px] sm:text-[13px] tracking-[0.08em] mt-0.5">
              Horace Mann&rsquo;s Weekly Newspaper Since 1903
            </p>
          </div>

          {/* Right nav */}
          <div className="flex items-center justify-end gap-4 sm:gap-5 font-headline text-base">
            <Link
              href="/about"
              className="hidden sm:inline font-bold tracking-wide"
            >
              About
            </Link>
            <div className="hidden md:block">
              <AccountDropdown
                userName={session?.user?.name}
                userEmail={session?.user?.email}
                userRole={session?.user?.role ?? "READER"}
                isAdmin={session?.user?.isAdmin ?? false}
                isEditor={session?.user?.role === "EDITOR"}
              />
            </div>
            <Link href="/search" aria-label="Search" className="p-1">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="16.5"
                  y1="16.5"
                  x2="22"
                  y2="22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* ============ DATE BAR ============ */}
      <div className="border-t border-rule">
        <p className="text-center font-headline text-[12px] sm:text-[13px] font-semibold tracking-[0.05em] py-1.5">
          {formatDateLong(latestDate)}
        </p>
      </div>

      {/* ============ SECTION NAV ============ */}
      <nav className="border-t border-b border-rule overflow-x-auto">
        <div className="max-w-[1200px] mx-auto flex justify-between gap-6 px-4 sm:px-16 py-3 min-w-max sm:min-w-0">
          {NAV_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="font-headline text-lg sm:text-xl tracking-wide whitespace-nowrap hover:text-maroon transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {featured ? (
          <div className="flex flex-col lg:flex-row">
            {/* ---------- FEATURED ARTICLE ---------- */}
            <article className="lg:flex-[3] lg:pr-10 pb-8 lg:pb-0">
              {/* Section label */}
              <Link
                href={SECTION_HREFS[featured.section] ?? "#"}
                className="font-headline text-maroon italic text-lg"
              >
                {SECTION_LABELS[featured.section] ?? featured.section}
              </Link>

              {/* Headline */}
              <h2 className="font-headline text-[26px] sm:text-[30px] lg:text-[34px] font-bold leading-tight mt-2 mb-5">
                <Link
                  href={`/article/${featured.slug}`}
                  className="hover:text-maroon transition-colors"
                >
                  {featured.title}
                </Link>
              </h2>

              {/* Excerpt with floated image */}
              <div className="featured-excerpt text-[17px] leading-[1.7]">
                {featured.featuredImage && (
                  <figure className="sm:float-right sm:ml-6 mb-5 sm:w-[55%] sm:max-w-[420px]">
                    <img
                      src={featured.featuredImage}
                      alt={
                        featured.images[0]?.altText ?? featured.title
                      }
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

            {/* Vertical Divider */}
            <div className="hidden lg:block w-px bg-rule shrink-0" />

            {/* ---------- SIDEBAR ---------- */}
            <aside className="lg:flex-[2] lg:pl-8 border-t border-neutral-300 lg:border-t-0 pt-6 lg:pt-0">
              <div className="divide-y divide-neutral-300">
                {sidebar.map((article) => {
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
                        <Link
                          href={SECTION_HREFS[article.section] ?? "#"}
                          className="text-maroon italic shrink-0"
                        >
                          {SECTION_LABELS[article.section] ??
                            article.section}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View More */}
              <div className="text-right mt-4 pt-2">
                <Link
                  href="/section/news"
                  className="font-headline text-[14px] font-semibold tracking-wide hover:text-maroon transition-colors"
                >
                  view more &gt;
                </Link>
              </div>
            </aside>
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-24">
            <p className="font-headline text-2xl text-neutral-400">
              No articles published yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
