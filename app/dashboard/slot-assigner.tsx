"use client";

import { useState, useRef } from "react";
import { assignArticleToSlot } from "@/app/dashboard/group-actions";

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

export function SlotAssigner({
  slotId,
  groupId,
  currentArticleId,
  currentArticleTitle,
  availableArticles,
}: {
  slotId: string;
  groupId: string;
  currentArticleId: string | null;
  currentArticleTitle: string | null;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentArticleTitle);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? availableArticles.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : availableArticles.slice(0, 8);

  async function handleSelect(articleId: string, articleTitle: string) {
    setTitle(articleTitle);
    setQuery("");
    setOpen(false);
    await assignArticleToSlot(slotId, articleId, groupId);
  }

  async function handleClear() {
    setTitle(null);
    await assignArticleToSlot(slotId, null, groupId);
  }

  if (title) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="font-headline text-[14px] font-semibold truncate">{title}</p>
        <button
          type="button"
          onClick={handleClear}
          className="cursor-pointer text-caption/40 hover:text-maroon text-[16px] shrink-0"
          title="Remove article"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search articles..."
        className="w-full border border-ink/15 px-3 py-1.5 font-headline text-[13px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink/15 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-20 max-h-48 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(a.id, a.title)}
              className="cursor-pointer w-full text-left px-3 py-2 font-headline text-[13px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors flex items-baseline justify-between gap-2"
            >
              <span className="truncate">{a.title}</span>
              <span className="text-[11px] text-caption/50 shrink-0">{SECTION_LABELS[a.section] ?? a.section}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
