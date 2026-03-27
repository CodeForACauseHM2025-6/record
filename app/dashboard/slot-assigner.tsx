"use client";

import { useState, useRef } from "react";
import { assignArticleToSlot, assignMediaToSlot, clearSlot } from "@/app/dashboard/group-actions";

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

interface SlotAssignerProps {
  slotId: string;
  groupId: string;
  currentArticleId: string | null;
  currentArticleTitle: string | null;
  currentMediaUrl: string | null;
  currentMediaType: string | null;
  currentMediaAlt: string | null;
  currentLockToRow: boolean;
  currentRowSpan: number | null;
  currentAutoplay: boolean;
  availableArticles: { id: string; title: string; section: string }[];
}

export function SlotAssigner({
  slotId,
  groupId,
  currentArticleId,
  currentArticleTitle,
  currentMediaUrl,
  currentMediaType,
  currentMediaAlt,
  currentLockToRow,
  currentRowSpan,
  currentAutoplay,
  availableArticles,
}: SlotAssignerProps) {
  const hasMedia = !!currentMediaUrl;
  const [mode, setMode] = useState<"article" | "media">(hasMedia ? "media" : "article");

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode("article")}
          className={`cursor-pointer font-headline text-[11px] tracking-wide px-2.5 py-1 transition-colors ${
            mode === "article" ? "bg-ink text-white font-semibold" : "border border-ink/15 text-caption"
          }`}
        >
          Article
        </button>
        <button
          type="button"
          onClick={() => setMode("media")}
          className={`cursor-pointer font-headline text-[11px] tracking-wide px-2.5 py-1 transition-colors ${
            mode === "media" ? "bg-maroon text-white font-semibold" : "border border-ink/15 text-caption"
          }`}
        >
          Media
        </button>
      </div>

      {mode === "article" ? (
        <ArticleAssigner
          slotId={slotId}
          groupId={groupId}
          currentTitle={currentArticleTitle}
          availableArticles={availableArticles}
        />
      ) : (
        <MediaAssigner
          slotId={slotId}
          groupId={groupId}
          currentMediaUrl={currentMediaUrl}
          currentMediaType={currentMediaType}
          currentMediaAlt={currentMediaAlt}
          currentLockToRow={currentLockToRow}
          currentRowSpan={currentRowSpan}
          currentAutoplay={currentAutoplay}
        />
      )}
    </div>
  );
}

function ArticleAssigner({
  slotId,
  groupId,
  currentTitle,
  availableArticles,
}: {
  slotId: string;
  groupId: string;
  currentTitle: string | null;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);

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
    await clearSlot(slotId, groupId);
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
    <div className="relative">
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

function MediaAssigner({
  slotId,
  groupId,
  currentMediaUrl,
  currentMediaType,
  currentMediaAlt,
  currentLockToRow,
  currentRowSpan,
  currentAutoplay,
}: {
  slotId: string;
  groupId: string;
  currentMediaUrl: string | null;
  currentMediaType: string | null;
  currentMediaAlt: string | null;
  currentLockToRow: boolean;
  currentRowSpan: number | null;
  currentAutoplay: boolean;
}) {
  const [mediaUrl, setMediaUrl] = useState(currentMediaUrl ?? "");
  const [mediaType, setMediaType] = useState(currentMediaType ?? "");
  const [alt, setAlt] = useState(currentMediaAlt ?? "");
  const [lockToRow, setLockToRow] = useState(currentLockToRow);
  const [rowSpan, setRowSpan] = useState<string>(currentRowSpan?.toString() ?? "");
  const [autoplay, setAutoplay] = useState(currentAutoplay);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(url: string, type: string, altVal: string, lock: boolean, span: string, auto: boolean) {
    if (!url || !type) return;
    await assignMediaToSlot(slotId, url, type, altVal, lock, span ? parseInt(span, 10) : null, auto, groupId);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let type = "image";
    if (file.type.startsWith("video/")) type = "video";
    else if (file.type === "image/gif") type = "gif";
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMediaUrl(reader.result);
        setMediaType(type);
        save(reader.result, type, alt, lockToRow, rowSpan, autoplay);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleClear() {
    setMediaUrl("");
    setMediaType("");
    setAlt("");
    setLockToRow(true);
    setRowSpan("");
    setAutoplay(true);
    if (fileRef.current) fileRef.current.value = "";
    await clearSlot(slotId, groupId);
  }

  return (
    <div className="space-y-2">
      {mediaUrl ? (
        <div className="relative">
          {mediaType === "video" ? (
            <video src={mediaUrl} className="w-full max-h-[100px] object-contain bg-neutral-100" muted />
          ) : (
            <img src={mediaUrl} alt={alt || "Preview"} className="w-full max-h-[100px] object-contain bg-neutral-100" />
          )}
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
          className="cursor-pointer w-full border border-dashed border-ink/20 py-4 text-center hover:border-maroon/40 transition-colors"
        >
          <span className="block font-headline text-[12px] text-caption/60">Upload media</span>
          <span className="block font-headline text-[10px] text-caption/30 mt-0.5">JPG, PNG, WebP, GIF, MP4, WebM</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        onChange={handleFile}
        className="hidden"
      />
      <input
        type="text"
        value={alt}
        onChange={(e) => { setAlt(e.target.value); }}
        onBlur={() => { if (mediaUrl) save(mediaUrl, mediaType, alt, lockToRow, rowSpan, autoplay); }}
        placeholder="Alt text..."
        className="w-full border border-ink/15 px-2 py-1 font-headline text-[11px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
      />
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 font-headline text-[11px] tracking-wide cursor-pointer">
          <input type="checkbox" checked={lockToRow} onChange={(e) => { setLockToRow(e.target.checked); if (mediaUrl) save(mediaUrl, mediaType, alt, e.target.checked, rowSpan, autoplay); }} />
          Lock to row
        </label>
        {!lockToRow && (
          <div className="flex items-center gap-2">
            <span className="font-headline text-[11px] text-caption tracking-wide">Row span:</span>
            <input
              type="number"
              min="1"
              value={rowSpan}
              onChange={(e) => { setRowSpan(e.target.value); }}
              onBlur={() => { if (mediaUrl) save(mediaUrl, mediaType, alt, lockToRow, rowSpan, autoplay); }}
              placeholder="Auto"
              className="w-16 border border-ink/15 px-2 py-0.5 font-headline text-[11px] outline-none focus:border-ink transition-colors"
            />
          </div>
        )}
        {mediaType === "video" && (
          <label className="flex items-center gap-2 font-headline text-[11px] tracking-wide cursor-pointer">
            <input type="checkbox" checked={autoplay} onChange={(e) => { setAutoplay(e.target.checked); if (mediaUrl) save(mediaUrl, mediaType, alt, lockToRow, rowSpan, e.target.checked); }} />
            Autoplay (muted)
          </label>
        )}
      </div>
    </div>
  );
}
