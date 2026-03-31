"use client";

import { useState, useRef } from "react";
import { assignToBlockSlot, assignMediaToBlockSlot, clearBlockSlot } from "@/app/dashboard/group-actions";

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

interface BlockSlotAssignerProps {
  slotId: string;
  slotRole: string;
  slotLabel: string;
  groupId: string;
  currentArticleId: string | null;
  currentArticleTitle: string | null;
  currentMediaUrl: string | null;
  availableArticles: { id: string; title: string; section: string }[];
}

export function BlockSlotAssigner({
  slotId,
  slotRole,
  slotLabel,
  groupId,
  currentArticleId,
  currentArticleTitle,
  currentMediaUrl,
  availableArticles,
}: BlockSlotAssignerProps) {
  const isMediaSlot = slotRole === "image" || slotRole === "media";

  return (
    <div className="border border-dashed border-ink/15 p-3">
      <p className="font-headline text-[11px] tracking-[0.08em] uppercase text-caption/50 mb-2">
        {slotLabel}
      </p>
      {isMediaSlot ? (
        <MediaSlotAssigner
          slotId={slotId}
          groupId={groupId}
          currentMediaUrl={currentMediaUrl}
        />
      ) : (
        <ArticleSlotAssigner
          slotId={slotId}
          groupId={groupId}
          currentTitle={currentArticleTitle}
          availableArticles={availableArticles}
          headlineOnly={slotRole === "headline"}
        />
      )}
    </div>
  );
}

function ArticleSlotAssigner({
  slotId,
  groupId,
  currentTitle,
  availableArticles,
  headlineOnly,
}: {
  slotId: string;
  groupId: string;
  currentTitle: string | null;
  availableArticles: { id: string; title: string; section: string }[];
  headlineOnly: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);

  const filtered = query.length > 0
    ? availableArticles.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : availableArticles.slice(0, 8);

  async function handleSelect(articleId: string, articleTitle: string) {
    setTitle(articleTitle);
    setQuery("");
    setOpen(false);
    await assignToBlockSlot(slotId, articleId, groupId);
  }

  async function handleClear() {
    setTitle(null);
    await clearBlockSlot(slotId, groupId);
  }

  if (title) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className={`font-headline ${headlineOnly ? "text-[13px]" : "text-[14px] font-semibold"} truncate`}>{title}</p>
        <button
          type="button"
          onClick={handleClear}
          className="cursor-pointer text-caption/40 hover:text-maroon text-[16px] shrink-0"
          title="Remove"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={headlineOnly ? "Search for headline..." : "Search articles..."}
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

function MediaSlotAssigner({
  slotId,
  groupId,
  currentMediaUrl,
}: {
  slotId: string;
  groupId: string;
  currentMediaUrl: string | null;
}) {
  const [mediaUrl, setMediaUrl] = useState(currentMediaUrl ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState("");

  const MAX_FILE_SIZE = 30 * 1024 * 1024;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeError("");
    if (file.size > MAX_FILE_SIZE) {
      setSizeError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 30MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    let type = "image";
    if (file.type.startsWith("video/")) type = "video";
    else if (file.type === "image/gif") type = "gif";
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMediaUrl(reader.result);
        assignMediaToBlockSlot(slotId, reader.result, type, "", "", groupId);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleClear() {
    setMediaUrl("");
    if (fileRef.current) fileRef.current.value = "";
    await clearBlockSlot(slotId, groupId);
  }

  return (
    <div>
      {mediaUrl ? (
        <div className="relative">
          <img src={mediaUrl} alt="Preview" className="w-full max-h-[100px] object-contain bg-neutral-100" />
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer absolute top-1 right-1 bg-white/90 border border-ink/10 w-5 h-5 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[12px]"
          >
            &times;
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer w-full border border-dashed border-ink/20 py-4 text-center hover:border-ink/40 transition-colors"
        >
          <span className="block font-headline text-[12px] text-caption">Upload media</span>
          <span className="block font-headline text-[10px] text-caption/50 mt-0.5">JPG, PNG, WebP, GIF, MP4</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={handleFile} className="hidden" />
      {sizeError && <p className="font-headline text-[11px] text-maroon font-semibold mt-1">{sizeError}</p>}
    </div>
  );
}
