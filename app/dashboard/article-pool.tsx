"use client";

import { useState } from "react";
import { addArticleToPool, removeArticleFromPool } from "@/app/dashboard/group-actions";

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

interface ArticlePoolProps {
  groupId: string;
  poolArticles: { id: string; title: string; section: string }[];
  allPublished: { id: string; title: string; section: string }[];
}

export function ArticlePool({ groupId, poolArticles, allPublished }: ArticlePoolProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState(poolArticles);

  const poolIds = new Set(pool.map((a) => a.id));
  const available = allPublished.filter((a) => !poolIds.has(a.id));
  const filtered = query.length > 0
    ? available.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : available.slice(0, 8);

  async function handleAdd(article: { id: string; title: string; section: string }) {
    setPool([...pool, article]);
    setQuery("");
    setOpen(false);
    await addArticleToPool(groupId, article.id);
  }

  async function handleRemove(articleId: string) {
    setPool(pool.filter((a) => a.id !== articleId));
    await removeArticleFromPool(groupId, articleId);
  }

  return (
    <div>
      {/* Pool list */}
      {pool.length === 0 ? (
        <p className="font-headline text-[14px] text-caption/50 italic mb-3">
          No articles added yet. Search below to add articles to this edition.
        </p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {pool.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border border-ink/10 px-3 py-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-headline text-[14px] font-semibold truncate">{a.title}</span>
                <span className="font-headline text-[11px] text-caption/50 shrink-0">{SECTION_LABELS[a.section] ?? a.section}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                className="cursor-pointer text-caption/40 hover:text-maroon text-[16px] shrink-0"
                title="Remove from edition"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search to add */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search published articles to add..."
          className="w-full border border-ink/20 px-4 py-2 font-headline text-[14px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
        />
        {open && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink/15 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-20 max-h-64 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(a)}
                className="cursor-pointer w-full text-left px-3 py-2 font-headline text-[14px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors flex items-baseline justify-between gap-2"
              >
                <span className="truncate">{a.title}</span>
                <span className="text-[11px] text-caption/50 shrink-0">{SECTION_LABELS[a.section] ?? a.section}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
