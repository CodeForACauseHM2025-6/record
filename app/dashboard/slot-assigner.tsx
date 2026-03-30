"use client";

import { useState, useRef } from "react";
import { assignArticleToSlot, assignMediaToSlot, clearSlot, updateSlotSpan } from "@/app/dashboard/group-actions";

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
  currentMediaCredit: string | null;
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
  currentMediaCredit,
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
            mode === "media" ? "bg-ink text-white font-semibold" : "border border-ink/15 text-caption"
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
          currentLockToRow={currentLockToRow}
          currentRowSpan={currentRowSpan}
          availableArticles={availableArticles}
        />
      ) : (
        <MediaAssigner
          slotId={slotId}
          groupId={groupId}
          currentMediaUrl={currentMediaUrl}
          currentMediaType={currentMediaType}
          currentMediaAlt={currentMediaAlt}
          currentMediaCredit={currentMediaCredit}
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
  currentLockToRow,
  currentRowSpan,
  availableArticles,
}: {
  slotId: string;
  groupId: string;
  currentTitle: string | null;
  currentLockToRow: boolean;
  currentRowSpan: number | null;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [lockToRow, setLockToRow] = useState(currentLockToRow);
  const [rowSpan, setRowSpan] = useState<string>(currentRowSpan?.toString() ?? "");

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

  const spanControls = (
    <div className="mt-2 space-y-1.5">
      <label className="flex items-center gap-2 font-headline text-[12px] tracking-wide cursor-pointer">
        <input type="checkbox" checked={lockToRow} onChange={(e) => {
          setLockToRow(e.target.checked);
          updateSlotSpan(slotId, e.target.checked, e.target.checked ? null : (rowSpan ? parseFloat(rowSpan) : null), groupId);
        }} />
        Lock to row
      </label>
      {!lockToRow && (
        <div className="flex items-center gap-2">
          <span className="font-headline text-[12px] text-caption tracking-wide">Row span:</span>
          <input
            type="number" min="0.5" step="0.5" value={rowSpan}
            onChange={(e) => setRowSpan(e.target.value)}
            onBlur={() => updateSlotSpan(slotId, lockToRow, rowSpan ? parseFloat(rowSpan) : null, groupId)}
            placeholder="Auto"
            className="w-16 border border-ink/15 px-2 py-0.5 font-headline text-[11px] outline-none focus:border-ink transition-colors"
          />
        </div>
      )}
    </div>
  );

  if (title) {
    return (
      <div>
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
        {spanControls}
      </div>
    );
  }

  return (
    <div>
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
      {spanControls}
    </div>
  );
}

function MediaAssigner({
  slotId,
  groupId,
  currentMediaUrl,
  currentMediaType,
  currentMediaAlt,
  currentMediaCredit,
  currentLockToRow,
  currentRowSpan,
  currentAutoplay,
}: {
  slotId: string;
  groupId: string;
  currentMediaUrl: string | null;
  currentMediaType: string | null;
  currentMediaAlt: string | null;
  currentMediaCredit: string | null;
  currentLockToRow: boolean;
  currentRowSpan: number | null;
  currentAutoplay: boolean;
}) {
  const [mediaUrl, setMediaUrl] = useState(currentMediaUrl ?? "");
  const [mediaType, setMediaType] = useState(currentMediaType ?? "");
  const [alt, setAlt] = useState(currentMediaAlt ?? "");
  const [credit, setCredit] = useState(currentMediaCredit ?? "");
  const [lockToRow, setLockToRow] = useState(currentLockToRow);
  const [rowSpan, setRowSpan] = useState<string>(currentRowSpan?.toString() ?? "");
  const [autoplay, setAutoplay] = useState(currentAutoplay);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(url: string, type: string, altVal: string, creditVal: string, lock: boolean, span: string, auto: boolean) {
    if (!url || !type) return;
    await assignMediaToSlot(slotId, url, type, altVal, creditVal, lock, span ? parseFloat(span) : null, auto, groupId);
  }

  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
  const [sizeError, setSizeError] = useState("");

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
        setMediaType(type);
        save(reader.result, type, alt, credit, lockToRow, rowSpan, autoplay);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleClear() {
    setMediaUrl(""); setMediaType(""); setAlt(""); setCredit("");
    setLockToRow(true); setRowSpan(""); setAutoplay(true); setSettingsOpen(false);
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
          {/* Settings icon */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="cursor-pointer absolute bottom-1 right-1 bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-ink transition-colors"
            title="Media settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {/* Remove */}
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
          <span className="block font-headline text-[10px] text-caption/50 mt-0.5">JPG, PNG, WebP, GIF, MP4, WebM</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={handleFile} className="hidden" />
      {sizeError && (
        <p className="font-headline text-[11px] text-maroon font-semibold">{sizeError}</p>
      )}

      {/* Lock to row — always visible */}
      <label className="flex items-center gap-2 font-headline text-[12px] tracking-wide cursor-pointer">
        <input type="checkbox" checked={lockToRow} onChange={(e) => { setLockToRow(e.target.checked); if (mediaUrl) save(mediaUrl, mediaType, alt, credit, e.target.checked, rowSpan, autoplay); }} />
        Lock to row
      </label>
      {!lockToRow && (
        <div className="flex items-center gap-2">
          <span className="font-headline text-[12px] text-caption tracking-wide">Row span:</span>
          <input
            type="number" min="0.5" step="0.5" value={rowSpan}
            onChange={(e) => setRowSpan(e.target.value)}
            onBlur={() => { if (mediaUrl) save(mediaUrl, mediaType, alt, credit, lockToRow, rowSpan, autoplay); }}
            placeholder="Auto"
            className="w-16 border border-ink/15 px-2 py-0.5 font-headline text-[11px] outline-none focus:border-ink transition-colors"
          />
        </div>
      )}

      {/* Settings floating popover */}
      <div className="relative">
        <div className={`absolute left-0 right-0 top-0 z-30 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top ${
          settingsOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}>
        <div className="border border-ink/15 bg-white p-3 space-y-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <p className="font-headline text-[12px] font-semibold tracking-[0.06em] uppercase text-ink">Settings</p>
            <button type="button" onClick={() => setSettingsOpen(false)} className="cursor-pointer text-caption hover:text-ink text-[14px]">&times;</button>
          </div>
          <div>
            <label className="block font-headline text-[10px] font-semibold tracking-[0.06em] uppercase text-caption mb-1">Alt Text</label>
            <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image..."
              className="w-full border border-ink/20 px-2.5 py-1.5 font-body text-[13px] placeholder:text-caption/40 outline-none focus:border-ink transition-colors" />
          </div>
          <div>
            <label className="block font-headline text-[10px] font-semibold tracking-[0.06em] uppercase text-caption mb-1">Credit</label>
            <input type="text" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Photo by..."
              className="w-full border border-ink/20 px-2.5 py-1.5 font-body text-[13px] placeholder:text-caption/40 outline-none focus:border-ink transition-colors" />
          </div>
          {mediaType === "video" && (
            <label className="flex items-center gap-2 font-headline text-[12px] tracking-wide cursor-pointer">
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
              Autoplay (muted)
            </label>
          )}
          <button type="button" onClick={() => { save(mediaUrl, mediaType, alt, credit, lockToRow, rowSpan, autoplay); setSettingsOpen(false); }}
            className="cursor-pointer w-full font-headline font-bold text-[12px] tracking-wide bg-ink text-white px-3 py-1.5 hover:bg-maroon transition-colors">
            Save
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
