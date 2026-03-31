"use client";

import { useState, useRef, useEffect } from "react";
import {
  addBlock,
  deleteBlock,
  updateDividerStyle,
  assignToBlockSlot,
  assignMediaToBlockSlot,
  clearBlockSlot,
} from "@/app/dashboard/group-actions";
import { PATTERNS, getMainPatterns, getSidebarPatterns } from "@/lib/patterns";
import { PatternPreview } from "@/app/dashboard/pattern-previews";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SlotData {
  id: string;
  slotRole: string;
  order: number;
  articleId: string | null;
  article: { id: string; title: string; section: string } | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaAlt: string | null;
  mediaCredit: string | null;
}

interface BlockWithSlots {
  id: string;
  pattern: string;
  order: number;
  dividerStyle: string;
  slots: SlotData[];
}

interface LayoutBuilderProps {
  groupId: string;
  mainBlocks: BlockWithSlots[];
  sidebarBlocks: BlockWithSlots[];
  availableArticles: { id: string; title: string; section: string }[];
}

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News",
  FEATURES: "Features",
  OPINIONS: "Opinions",
  A_AND_E: "A&E",
  LIONS_DEN: "Lion\u2019s Den",
  THE_ROUNDTABLE: "The Roundtable",
};

/* ------------------------------------------------------------------ */
/*  LayoutBuilder (root) — coordinates picking between columns         */
/* ------------------------------------------------------------------ */

export function LayoutBuilder({
  groupId,
  mainBlocks,
  sidebarBlocks,
  availableArticles,
}: LayoutBuilderProps) {
  // Which column is currently picking a pattern? null = none
  const [pickingColumn, setPickingColumn] = useState<"main" | "sidebar" | null>(null);
  // Which pattern is being previewed (hovered) in the picker
  const [previewPatternId, setPreviewPatternId] = useState<string | null>(null);

  async function handlePatternSelect(patternId: string) {
    if (!pickingColumn) return;
    const col = pickingColumn;
    setPickingColumn(null);
    setPreviewPatternId(null);
    await addBlock(groupId, col, patternId);
  }

  function handleCancelPick() {
    setPickingColumn(null);
    setPreviewPatternId(null);
  }

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main column */}
      <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
        {/* If sidebar is picking, show the pattern list here */}
        {pickingColumn === "sidebar" ? (
          <PatternList
            column="sidebar"
            onHover={setPreviewPatternId}
            onSelect={handlePatternSelect}
            onCancel={handleCancelPick}
          />
        ) : (
          <ColumnContent
            groupId={groupId}
            column="main"
            blocks={mainBlocks}
            availableArticles={availableArticles}
            onStartPick={() => setPickingColumn("main")}
            isPicking={pickingColumn === "main"}
            previewPatternId={pickingColumn === "main" ? previewPatternId : null}
          />
        )}
      </div>

      {/* Sidebar column */}
      <div className="lg:flex-[1] lg:pl-8 mt-8 lg:mt-0 border-t lg:border-t-0 border-neutral-200 pt-8 lg:pt-0">
        {/* If main is picking, show the pattern list here */}
        {pickingColumn === "main" ? (
          <PatternList
            column="main"
            onHover={setPreviewPatternId}
            onSelect={handlePatternSelect}
            onCancel={handleCancelPick}
          />
        ) : (
          <ColumnContent
            groupId={groupId}
            column="sidebar"
            blocks={sidebarBlocks}
            availableArticles={availableArticles}
            onStartPick={() => setPickingColumn("sidebar")}
            isPicking={pickingColumn === "sidebar"}
            previewPatternId={pickingColumn === "sidebar" ? previewPatternId : null}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ColumnContent — blocks + add button + optional pattern preview     */
/* ------------------------------------------------------------------ */

function ColumnContent({
  groupId,
  column,
  blocks,
  availableArticles,
  onStartPick,
  isPicking,
  previewPatternId,
}: {
  groupId: string;
  column: "main" | "sidebar";
  blocks: BlockWithSlots[];
  availableArticles: { id: string; title: string; section: string }[];
  onStartPick: () => void;
  isPicking: boolean;
  previewPatternId: string | null;
}) {
  return (
    <div>
      {blocks.length === 0 && !isPicking && (
        <div className="py-16 flex items-center justify-center">
          <button
            type="button"
            onClick={onStartPick}
            className="cursor-pointer border border-dashed border-neutral-300 px-10 py-8 hover:border-maroon hover:bg-maroon/5 transition-colors"
          >
            <span className="block text-neutral-400 text-[24px] text-center">+</span>
            <span className="block font-headline text-[13px] text-neutral-400 mt-1">
              Add a {column === "main" ? "main" : "sidebar"} block
            </span>
          </button>
        </div>
      )}

      {blocks.map((block, i) => (
        <div key={block.id}>
          {i > 0 && <Divider style={block.dividerStyle} />}
          <BlockView
            block={block}
            groupId={groupId}
            availableArticles={availableArticles}
          />
        </div>
      ))}

      {/* Pattern preview when hovering in the picker */}
      {isPicking && previewPatternId && (
        <div className="mt-4 border-2 border-dashed border-maroon/30 bg-maroon/5 p-4 rounded">
          <p className="font-headline text-[10px] tracking-[0.08em] uppercase text-maroon/60 mb-2">
            Preview: {PATTERNS[previewPatternId]?.name}
          </p>
          <PatternPreview patternId={previewPatternId} />
        </div>
      )}

      {/* Placeholder when picking but no hover yet */}
      {isPicking && !previewPatternId && (
        <div className="mt-4 border-2 border-dashed border-neutral-200 p-6 flex items-center justify-center">
          <p className="font-headline text-[12px] text-neutral-400">
            Hover a pattern to preview it here
          </p>
        </div>
      )}

      {blocks.length > 0 && !isPicking && (
        <div className="mt-4 mb-6">
          <button
            type="button"
            onClick={onStartPick}
            className="cursor-pointer w-full border border-dashed border-neutral-300 py-3 text-center hover:border-maroon hover:bg-maroon/5 transition-colors font-headline text-[13px] tracking-wide text-neutral-400"
          >
            + Add Block
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PatternList — shown in the opposite column when picking            */
/* ------------------------------------------------------------------ */

function PatternList({
  column,
  onHover,
  onSelect,
  onCancel,
}: {
  column: "main" | "sidebar";
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const patterns = column === "main" ? getMainPatterns() : getSidebarPatterns();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-headline text-[14px] font-semibold tracking-wide">
          Choose a {column === "main" ? "main" : "sidebar"} pattern
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer font-headline text-[12px] text-caption hover:text-maroon transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="space-y-1">
        {patterns.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseEnter={() => onHover(p.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(p.id)}
            className="cursor-pointer w-full text-left px-4 py-3 border border-neutral-100 hover:border-maroon hover:bg-maroon/5 transition-colors"
          >
            <span className="block font-headline text-[14px] font-semibold">{p.name}</span>
            <span className="block font-headline text-[12px] text-caption mt-0.5">{p.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Divider                                                            */
/* ------------------------------------------------------------------ */

function Divider({ style }: { style: string }) {
  if (style === "none") return <div className="h-4" />;
  if (style === "bold") return <div className="h-[3px] bg-ink my-4" />;
  return <div className="h-px bg-neutral-200 my-4" />;
}

/* ------------------------------------------------------------------ */
/*  BlockView                                                          */
/* ------------------------------------------------------------------ */

function BlockView({
  block,
  groupId,
  availableArticles,
}: {
  block: BlockWithSlots;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  const [hovered, setHovered] = useState(false);
  const patternDef = PATTERNS[block.pattern];

  return (
    <div
      className="relative group py-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute -top-1 -right-1 z-10 flex items-center gap-1.5 bg-white border border-neutral-200 shadow-sm px-2 py-1">
          {["light", "bold", "none"].map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => updateDividerStyle(block.id, style, groupId)}
              className={`cursor-pointer font-headline text-[10px] px-2 py-0.5 transition-colors ${
                block.dividerStyle === style
                  ? "bg-ink text-white"
                  : "border border-ink/15 text-caption hover:border-ink"
              }`}
            >
              {style}
            </button>
          ))}
          <div className="w-px h-4 bg-neutral-200 mx-0.5" />
          <button
            type="button"
            onClick={() => deleteBlock(block.id, groupId)}
            className="cursor-pointer font-headline text-[11px] text-caption/40 hover:text-maroon transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      <p className="font-headline text-[10px] tracking-[0.08em] uppercase text-caption/40 mb-2">
        {patternDef?.name ?? block.pattern}
      </p>

      <PatternSlotLayout
        pattern={block.pattern}
        slots={block.slots}
        patternDef={patternDef}
        groupId={groupId}
        availableArticles={availableArticles}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PatternSlotLayout — renders slots in the pattern's visual shape    */
/* ------------------------------------------------------------------ */

function PatternSlotLayout({
  pattern,
  slots,
  patternDef,
  groupId,
  availableArticles,
}: {
  pattern: string;
  slots: SlotData[];
  patternDef: (typeof PATTERNS)[string] | undefined;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  function slot(index: number) {
    const s = slots[index];
    if (!s) return null;
    const label = patternDef?.slots[index]?.label ?? s.slotRole;
    return <SlotView key={s.id} slot={s} slotLabel={label} groupId={groupId} availableArticles={availableArticles} />;
  }

  switch (pattern) {
    case "hero":
      return (
        <div className="flex gap-3" style={{ minHeight: 180 }}>
          <div className="flex-1 flex flex-col gap-2">
            {slot(0)}
            <div className="border-t border-neutral-200 pt-2 flex flex-col gap-2">
              {slot(2)}
              {slot(3)}
            </div>
          </div>
          <div className="flex-[1.2]">
            {slot(1)}
          </div>
        </div>
      );

    case "four-grid":
      return (
        <div className="grid grid-cols-2 gap-3">
          {slot(0)}
          {slot(1)}
          {slot(2)}
          {slot(3)}
        </div>
      );

    case "text-images":
      return (
        <div className="flex gap-3" style={{ minHeight: 150 }}>
          <div className="flex-1">{slot(0)}</div>
          <div className="flex-[0.4]">{slot(1)}</div>
          <div className="flex-[0.4]">{slot(2)}</div>
        </div>
      );

    case "headline-stack":
      return (
        <div className="flex flex-col">
          <div className="border-b-2 border-ink pb-2 mb-2">{slot(0)}</div>
          <div className="border-b-2 border-ink pb-2 mb-2">{slot(1)}</div>
          <div>{slot(2)}</div>
        </div>
      );

    case "two-thumbnails":
      return (
        <div className="grid grid-cols-2 gap-3">
          {slot(0)}
          {slot(1)}
        </div>
      );

    case "single-feature":
      return <div>{slot(0)}</div>;

    case "sb-feature":
      return <div>{slot(0)}</div>;

    case "sb-two-small":
      return (
        <div className="grid grid-cols-2 gap-2">
          {slot(0)}
          {slot(1)}
        </div>
      );

    case "sb-headlines":
      return (
        <div className="flex flex-col">
          <div className="border-b border-neutral-200 pb-2 mb-2">{slot(0)}</div>
          <div className="border-b border-neutral-200 pb-2 mb-2">{slot(1)}</div>
          <div>{slot(2)}</div>
        </div>
      );

    case "sb-thumbnails":
      return (
        <div className="flex flex-col gap-2">
          {slot(0)}
          {slot(1)}
          {slot(2)}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          {slots.map((s, i) => slot(i))}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  SlotView                                                           */
/* ------------------------------------------------------------------ */

function SlotView({
  slot,
  slotLabel,
  groupId,
  availableArticles,
}: {
  slot: SlotData;
  slotLabel: string;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const isMedia = slot.slotRole === "image" || slot.slotRole === "media";

  // Filled: article — show real content with clear button on hover
  if (slot.article) {
    return (
      <div className="relative group/slot">
        <div className="py-1">
          <p className="font-headline text-[14px] font-bold leading-snug">{slot.article.title}</p>
          <p className="font-headline text-[10px] text-caption italic mt-0.5">{SECTION_LABELS[slot.article.section] ?? slot.article.section}</p>
        </div>
        <button
          type="button"
          onClick={() => clearBlockSlot(slot.id, groupId)}
          className="cursor-pointer absolute -top-1 -right-1 bg-white border border-neutral-200 shadow-sm w-5 h-5 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[12px] opacity-0 group-hover/slot:opacity-100"
        >
          &times;
        </button>
      </div>
    );
  }

  // Filled: media — show actual image with clear button on hover
  if (slot.mediaUrl) {
    return (
      <div className="relative group/slot">
        <img src={slot.mediaUrl} alt={slot.mediaAlt ?? ""} className="w-full h-full min-h-[80px] object-cover bg-neutral-100" />
        <button
          type="button"
          onClick={() => clearBlockSlot(slot.id, groupId)}
          className="cursor-pointer absolute top-1 right-1 bg-white/90 border border-ink/10 w-5 h-5 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[12px] opacity-0 group-hover/slot:opacity-100"
        >
          &times;
        </button>
      </div>
    );
  }

  // Empty: show lorem ipsum placeholder with hover highlight + click to assign
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPopupOpen(!popupOpen)}
        className="cursor-pointer w-full text-left transition-all hover:outline hover:outline-2 hover:outline-maroon/40 hover:bg-maroon/5 rounded-sm"
      >
        {isMedia ? (
          <div className="bg-neutral-200 w-full min-h-[100px] flex items-center justify-center">
            <span className="font-headline text-[11px] text-neutral-400">{slotLabel}</span>
          </div>
        ) : slot.slotRole === "headline" ? (
          <div className="py-1">
            <p className="font-headline text-[13px] font-semibold text-neutral-300">Lorem Ipsum Dolor Sit Amet Consectetur</p>
          </div>
        ) : (
          <div className="py-1">
            <p className="font-headline text-[14px] font-bold leading-snug text-neutral-300">Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing</p>
            <p className="font-body text-[11px] text-neutral-200 leading-relaxed mt-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...</p>
            <p className="font-headline text-[10px] text-neutral-200 mt-1">By Author Name</p>
          </div>
        )}
      </button>

      {popupOpen && (
        isMedia ? (
          <MediaUploadPopup slotId={slot.id} groupId={groupId} onClose={() => setPopupOpen(false)} />
        ) : (
          <SlotAssignPopup slotId={slot.id} groupId={groupId} availableArticles={availableArticles} onClose={() => setPopupOpen(false)} />
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SlotAssignPopup                                                    */
/* ------------------------------------------------------------------ */

function SlotAssignPopup({
  slotId,
  groupId,
  availableArticles,
  onClose,
}: {
  slotId: string;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const filtered = query.length > 0
    ? availableArticles.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : availableArticles.slice(0, 8);

  async function handleSelect(articleId: string) {
    onClose();
    await assignToBlockSlot(slotId, articleId, groupId);
  }

  return (
    <div ref={ref} className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-30">
      <div className="p-2 border-b border-neutral-100">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full border border-ink/15 px-3 py-1.5 font-headline text-[13px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-3 font-headline text-[12px] text-caption/50 text-center">No articles found</p>
        )}
        {filtered.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => handleSelect(a.id)}
            className="cursor-pointer w-full text-left px-3 py-2 font-headline text-[13px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors flex items-baseline justify-between gap-2"
          >
            <span className="truncate">{a.title}</span>
            <span className="text-[11px] text-caption/50 shrink-0">{SECTION_LABELS[a.section] ?? a.section}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MediaUploadPopup                                                   */
/* ------------------------------------------------------------------ */

function MediaUploadPopup({
  slotId,
  groupId,
  onClose,
}: {
  slotId: string;
  groupId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState("");
  const MAX_FILE_SIZE = 30 * 1024 * 1024;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

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
        onClose();
        assignMediaToBlockSlot(slotId, reader.result, type, "", "", groupId);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div ref={ref} className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-30 p-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer w-full border border-dashed border-ink/20 py-6 text-center hover:border-ink/40 transition-colors"
      >
        <span className="block font-headline text-[13px] text-caption">Upload media</span>
        <span className="block font-headline text-[10px] text-caption/50 mt-0.5">JPG, PNG, WebP, GIF, MP4</span>
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={handleFile} className="hidden" />
      {sizeError && <p className="font-headline text-[11px] text-maroon font-semibold mt-2">{sizeError}</p>}
    </div>
  );
}
