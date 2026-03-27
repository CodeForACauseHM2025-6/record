"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  body: string;
  section: string;
  publishedAt: string | null;
  authorName: string;
  authorId: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getExcerpt(body: string): string {
  const plain = stripHtml(body);
  if (plain.length <= 200) return plain;
  return plain.slice(0, 200).replace(/\s+\S*$/, "") + "\u2026";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function SearchClient({ initialResults, initialQuery }: {
  initialResults: SearchResult[];
  initialQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [resultKey, setResultKey] = useState(0);
  const [, startTransition] = useTransition();

  // Sync from URL changes (back/forward)
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== query) {
      setQuery(urlQ);
      setSubmittedQuery(urlQ);
    }
  }, [searchParams]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    setSubmittedQuery(trimmed);

    startTransition(() => {
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search", { scroll: false });
    });

    if (!trimmed) {
      setResults([]);
      return;
    }

    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.articles);
      setResultKey((k) => k + 1);
    }
  }

  return (
    <>
      {/* Search input */}
      <form onSubmit={handleSearch} className="mt-6 w-full">
        <div className="flex w-full border-2 border-ink">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            autoFocus
            className="flex-1 min-w-0 px-5 py-4 font-headline text-[16px] sm:text-[18px] tracking-wide placeholder:text-caption/40 outline-none bg-transparent"
          />
          <button
            type="submit"
            className="cursor-pointer px-5 bg-ink text-white font-headline font-bold text-[15px] tracking-[0.06em] transition-colors duration-200 hover:bg-maroon shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </form>

      {/* Rule */}
      <div className="mt-8 h-[2px] bg-rule" />

      {/* Results */}
      {submittedQuery.length > 0 ? (
        <>
          <p className="font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mt-6 mb-6">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{submittedQuery}&rdquo;
          </p>

          {results.length > 0 ? (
            <div key={resultKey} className="divide-y divide-neutral-200">
              {results.map((article, i) => (
                <article
                  key={article.id}
                  className={`reveal py-6 first:pt-0 ${
                    i < 6 ? `reveal-delay-${Math.min(i + 1, 7)}` : ""
                  }`}
                >
                  <Link
                    href={SECTION_HREFS[article.section] ?? "#"}
                    className="font-headline text-maroon italic text-[14px] tracking-wide"
                  >
                    {SECTION_LABELS[article.section] ?? article.section}
                  </Link>

                  <h3 className="font-headline text-[20px] sm:text-[22px] font-bold leading-snug mt-1">
                    <Link
                      href={`/article/${article.slug}`}
                      className="hover:text-maroon transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  <p className="text-[15px] leading-[1.6] text-caption mt-2">
                    {getExcerpt(article.body)}
                  </p>

                  <div className="mt-3 font-headline text-[14px]">
                    <Link
                      href={`/profile/${article.authorId}`}
                      className="text-maroon font-semibold hover:underline"
                    >
                      {article.authorName}
                    </Link>
                    {article.publishedAt && (
                      <span className="text-caption ml-2">
                        &middot; {formatDate(article.publishedAt)}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
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
        <div className="text-center py-20">
          <div className="text-caption/20 mb-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-headline italic text-[18px] text-caption/40">
            Enter a query to search
          </p>
        </div>
      )}
    </>
  );
}
