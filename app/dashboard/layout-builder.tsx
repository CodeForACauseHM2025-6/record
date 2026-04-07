"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  addBlock,
  deleteBlock,
  updateDividerStyle,
  assignToBlockSlot,
  assignMediaToBlockSlot,
  clearBlockSlot,
  clearSlotArticle,
  clearSlotMedia,
  updateSlotScale,
  updateSlotImageScale,
  updateSlotPreviewLength,
  reorderBlocks,
  toggleSlotFeatured,
  toggleSlotByline,
  updateImageFloat,
  updateImageWidth,
  updateImageCrop,
  updateMediaCredit,
} from "@/app/dashboard/group-actions";
import { PATTERNS, getMainPatterns, getSidebarPatterns } from "@/lib/patterns";
import { getAuthorInfo } from "@/lib/article-helpers";
import { PatternPreview } from "@/app/dashboard/pattern-previews";
import { SCALE_FACTORS } from "@/lib/scale";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SlotData {
  id: string;
  slotRole: string;
  order: number;
  articleId: string | null;
  article: {
    id: string; title: string; slug?: string; section: string; body: string;
    featuredImage?: string | null; publishedAt?: Date | null;
    createdBy: { id: string; name: string; role: string; displayTitle: string | null };
    credits: { creditRole: string; user: { id: string; name: string } }[];
  } | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaAlt: string | null;
  mediaCredit: string | null;
  scale: string;
  imageScale: string;
  previewLength: number;
  featured: boolean;
  showByline: boolean;
  imageFloat: string;
  imageWidth: number;
  imageCrop: string;
  imageCropCustom: string | null;
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
  staffMembers: { id: string; name: string }[];
  placeholderOpacity?: number;
}

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

/* ------------------------------------------------------------------ */
/*  LayoutBuilder (root)                                               */
/* ------------------------------------------------------------------ */

export function LayoutBuilder({
  groupId,
  mainBlocks,
  sidebarBlocks,
  availableArticles,
  staffMembers,
  placeholderOpacity = 0.6,
}: LayoutBuilderProps) {
  const [pickingColumn, setPickingColumn] = useState<"main" | "sidebar" | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  async function handleSelect(patternId: string) {
    if (!pickingColumn) return;
    const col = pickingColumn;
    setPickingColumn(null);
    setPreviewId(null);
    await addBlock(groupId, col, patternId);
  }

  function handleCancel() {
    setPickingColumn(null);
    setPreviewId(null);
  }

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main column */}
      <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
        {pickingColumn === "sidebar" ? (
          /* Sidebar is picking — show picker list here in the main column */
          <PatternList
            column="sidebar"
            onHover={setPreviewId}
            onSelect={handleSelect}
            onCancel={handleCancel}
          />
        ) : (
          <ColumnView
            groupId={groupId}
            column="main"
            blocks={mainBlocks}
            availableArticles={availableArticles} staffMembers={staffMembers}
            opacity={placeholderOpacity}
            onStartPick={() => setPickingColumn("main")}
            isPicking={pickingColumn === "main"}
            previewId={pickingColumn === "main" ? previewId : null}
          />
        )}
      </div>

      {/* Sidebar column */}
      <div className="lg:flex-[1] lg:pl-8 mt-8 lg:mt-0 border-t lg:border-t-0 border-neutral-200 pt-8 lg:pt-0">
        {pickingColumn === "main" ? (
          /* Main is picking — show picker list here in the sidebar */
          <PatternList
            column="main"
            onHover={setPreviewId}
            onSelect={handleSelect}
            onCancel={handleCancel}
          />
        ) : (
          <ColumnView
            groupId={groupId}
            column="sidebar"
            blocks={sidebarBlocks}
            availableArticles={availableArticles} staffMembers={staffMembers}
            opacity={placeholderOpacity}
            onStartPick={() => setPickingColumn("sidebar")}
            isPicking={pickingColumn === "sidebar"}
            previewId={pickingColumn === "sidebar" ? previewId : null}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ColumnView                                                         */
/* ------------------------------------------------------------------ */

function ColumnView({
  groupId,
  column,
  blocks,
  availableArticles,
  staffMembers,
  opacity,
  onStartPick,
  isPicking,
  previewId,
}: {
  groupId: string;
  column: "main" | "sidebar";
  blocks: BlockWithSlots[];
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  opacity: number;
  onStartPick: () => void;
  isPicking: boolean;
  previewId: string | null;
}) {
  const isSidebar = column === "sidebar";

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
              Add a {isSidebar ? "sidebar" : "main"} block
            </span>
          </button>
        </div>
      )}

      {blocks.map((block, i) => (
        <div key={block.id}>
          <BlockView
            block={block}
            groupId={groupId}
            column={column}
            allBlocks={blocks}
            index={i}
            availableArticles={availableArticles} staffMembers={staffMembers}
            opacity={opacity}
          />
          {i < blocks.length - 1 && <Divider style={block.dividerStyle} />}
        </div>
      ))}

      {/* Pattern preview at bottom of column when picking */}
      {isPicking && previewId && (
        <div className="mt-4 border-2 border-dashed border-maroon/30 bg-maroon/5 p-4">
          <p className="font-headline text-[10px] tracking-[0.08em] uppercase text-maroon/60 mb-2">
            Preview: {PATTERNS[previewId]?.name}
          </p>
          <PatternPreview patternId={previewId} />
        </div>
      )}

      {isPicking && !previewId && (
        <div className="mt-4 border-2 border-dashed border-neutral-200 p-6 flex items-center justify-center">
          <p className="font-headline text-[12px] text-neutral-400">Hover a pattern to preview it here</p>
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
/*  PatternList — shown in the opposite column                         */
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
  if (style === "bold") return <div className="h-[2px] bg-ink my-4" />;
  return <div className="h-px bg-neutral-200 my-4" />;
}

/* ------------------------------------------------------------------ */
/*  BlockView                                                          */
/* ------------------------------------------------------------------ */

function BlockView({
  block,
  groupId,
  column,
  allBlocks,
  index,
  availableArticles,
  staffMembers,
  opacity,
}: {
  block: BlockWithSlots;
  groupId: string;
  column: "main" | "sidebar";
  allBlocks: BlockWithSlots[];
  index: number;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  opacity: number;
}) {
  const [hovered, setHovered] = useState(false);
  const patternDef = PATTERNS[block.pattern];
  const isFirst = index === 0;
  const isLast = index === allBlocks.length - 1;

  function swap(dir: -1 | 1) {
    const ids = allBlocks.map((b) => b.id);
    const j = index + dir;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorderBlocks(groupId, column, ids);
  }

  return (
    <div
      className="relative group py-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute -top-1 -right-1 z-10 flex items-center gap-1.5 bg-white border border-neutral-200 shadow-sm px-2 py-1">
          {!isFirst && (
            <button
              type="button"
              onClick={() => swap(-1)}
              className="cursor-pointer font-headline text-[11px] text-caption/60 hover:text-maroon transition-colors px-0.5"
              title="Move up"
            >
              &uarr;
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              onClick={() => swap(1)}
              className="cursor-pointer font-headline text-[11px] text-caption/60 hover:text-maroon transition-colors px-0.5"
              title="Move down"
            >
              &darr;
            </button>
          )}
          {(!isFirst || !isLast) && <div className="w-px h-4 bg-neutral-200 mx-0.5" />}
          {!isLast && (
            <>
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
            </>
          )}
          <button
            type="button"
            onClick={() => deleteBlock(block.id, groupId)}
            className="cursor-pointer font-headline text-[11px] text-caption/40 hover:text-maroon transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      <p className="absolute -left-2 -translate-x-full font-headline text-[10px] tracking-[0.08em] uppercase text-caption/30 whitespace-nowrap" style={{ top: 8 }}>
        {patternDef?.name ?? block.pattern}
      </p>

      <PatternSlotLayout
        pattern={block.pattern}
        slots={block.slots}
        patternDef={patternDef}
        groupId={groupId}
        availableArticles={availableArticles} staffMembers={staffMembers}
        opacity={opacity}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PatternSlotLayout                                                  */
/* ------------------------------------------------------------------ */

function PatternSlotLayout({
  pattern,
  slots,
  patternDef,
  groupId,
  availableArticles,
  staffMembers,
  opacity,
}: {
  pattern: string;
  slots: SlotData[];
  patternDef: (typeof PATTERNS)[string] | undefined;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  opacity: number;
}) {
  function slot(index: number, options?: { showImage?: boolean; imagePosition?: "top" | "left" | "thumbnail"; size?: "sm" | "md" | "lg" }) {
    const s = slots[index];
    if (!s) return null;
    const label = patternDef?.slots[index]?.label ?? s.slotRole;
    return <SlotView key={s.id} slot={s} slotLabel={label} groupId={groupId} availableArticles={availableArticles} staffMembers={staffMembers} opacity={opacity} showImage={options?.showImage} imagePosition={options?.imagePosition} size={options?.size} />;
  }

  switch (pattern) {
    case "hero":
      return (
        <div>
          <div className="flex gap-6" style={{ minHeight: 140 }}>
            <div className="w-[40%]">{slot(0)}</div>
            <div className="w-[60%]">{slot(1)}</div>
          </div>
          <div className="border-t border-neutral-200 mt-3 pt-3 flex gap-4">
            <div className="flex-1">{slot(2, { size: "md" })}</div>
            <div className="flex-1 border-l border-neutral-200 pl-4">{slot(3, { size: "md" })}</div>
          </div>
        </div>
      );
    case "four-grid":
      return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {slot(0, { size: "md" })}{slot(1, { size: "md" })}
          {slot(2, { showImage: true, imagePosition: "left", size: "md" })}
          {slot(3, { showImage: true, imagePosition: "left", size: "md" })}
        </div>
      );
    case "text-images":
      return (
        <div className="flex gap-6" style={{ minHeight: 200 }}>
          <div className="w-[40%]">{slot(0)}</div>
          <div className="w-[30%]">{slot(1)}</div>
          <div className="w-[30%]">{slot(2)}</div>
        </div>
      );
    case "headline-stack":
      return (
        <div className="flex flex-col">
          <div className="border-b-2 border-ink pb-3 mb-3">{slot(0)}</div>
          <div className="border-b-2 border-ink pb-3 mb-3">{slot(1)}</div>
          <div>{slot(2)}</div>
        </div>
      );
    case "two-thumbnails":
      return (
        <div className="grid grid-cols-2 gap-6">
          {slot(0, { showImage: true, imagePosition: "top", size: "md" })}
          {slot(1, { showImage: true, imagePosition: "top", size: "md" })}
        </div>
      );
    case "single-feature":
      return <div>{slot(0, { showImage: true, imagePosition: "top" })}</div>;
    case "sb-feature":
      return <div>{slot(0, { showImage: true, imagePosition: "top", size: "md" })}</div>;
    case "sb-two-small":
      return (
        <div className="flex gap-4">
          <div className="flex-1">{slot(0, { showImage: true, imagePosition: "top", size: "sm" })}</div>
          <div className="flex-1">{slot(1, { showImage: true, imagePosition: "top", size: "sm" })}</div>
        </div>
      );
    case "sb-headlines":
      return (
        <div className="flex flex-col">
          <div className="border-b border-neutral-200 pb-2 mb-2">{slot(0, { size: "sm" })}</div>
          <div className="border-b border-neutral-200 pb-2 mb-2">{slot(1, { size: "sm" })}</div>
          <div>{slot(2, { size: "sm" })}</div>
        </div>
      );
    case "sb-thumbnails":
      return (
        <div className="flex flex-col">
          <div className="border-b border-neutral-100 pb-2 mb-2">{slot(0, { showImage: true, imagePosition: "thumbnail", size: "sm" })}</div>
          <div className="border-b border-neutral-100 pb-2 mb-2">{slot(1, { showImage: true, imagePosition: "thumbnail", size: "sm" })}</div>
          <div>{slot(2, { showImage: true, imagePosition: "thumbnail", size: "sm" })}</div>
        </div>
      );
    default:
      return <div className="space-y-2">{slots.map((_, i) => slot(i))}</div>;
  }
}

/* ------------------------------------------------------------------ */
/*  Image crop aspect-ratio helper                                     */
/* ------------------------------------------------------------------ */

const CROP_RATIOS: Record<string, number | null> = {
  original: null,
  landscape: 16 / 9,
  portrait: 3 / 4,
  square: 1,
};

function parseCropRatio(crop: string, custom: string | null): number | null {
  if (crop === "custom" && custom) {
    const [w, h] = custom.split(":").map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  return CROP_RATIOS[crop] ?? null;
}

/* ------------------------------------------------------------------ */
/*  ResizableImage — drag-to-resize with aspect-ratio lock            */
/* ------------------------------------------------------------------ */

function ResizableImage({
  src,
  alt,
  credit,
  imageFloat,
  imageWidth,
  cropRatio,
  onWidthChange,
  onWidthCommit,
  onFloatChange,
}: {
  src: string;
  alt: string;
  credit: string | null;
  imageFloat: string;
  imageWidth: number;
  cropRatio: number | null;
  onWidthChange: (w: number) => void;
  onWidthCommit: (w: number) => void;
  onFloatChange: (f: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startX.current = e.clientX;
    startW.current = imageWidth;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !containerRef.current) return;
    const parentW = containerRef.current.parentElement?.clientWidth ?? 400;
    const deltaPx = e.clientX - startX.current;
    const sign = imageFloat === "right" ? -1 : 1;
    const deltaPct = (deltaPx / parentW) * 100 * sign;
    const newW = Math.max(10, Math.min(100, Math.round(startW.current + deltaPct)));
    onWidthChange(newW);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    onWidthCommit(imageWidth);
  }

  const floatClass = imageFloat === "left" ? "float-left mr-3 mb-2" : imageFloat === "right" ? "float-right ml-3 mb-2" : "";

  return (
    <div
      ref={containerRef}
      className={`relative group/resize ${floatClass}`}
      style={{
        width: imageFloat === "full" ? "100%" : `${imageWidth}%`,
        ...(cropRatio ? { aspectRatio: String(cropRatio) } : {}),
      }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full bg-neutral-100"
        style={{ objectFit: cropRatio ? "cover" : "contain" }}
        draggable={false}
      />
      {credit && (
        <span className="absolute bottom-1 right-1 font-headline text-[9px] text-white/80 bg-black/40 px-1.5 py-0.5">{credit}</span>
      )}
      {/* Width indicator */}
      {imageFloat !== "full" && (
        <span className={`absolute bottom-1 font-headline text-[9px] bg-white/90 border border-ink/10 px-1 py-0.5 text-caption transition-opacity ${imageFloat === "right" ? "left-5" : "right-5"} ${dragging ? "opacity-100" : "opacity-0 group-hover/resize:opacity-100"}`}>
          {imageWidth}%
        </span>
      )}
      {/* Resize handle — on the outer edge (right for float-left, left for float-right) */}
      {imageFloat !== "full" && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`absolute bottom-0 w-6 h-6 cursor-${imageFloat === "right" ? "nesw" : "nwse"}-resize flex items-center justify-center transition-opacity ${
            imageFloat === "right" ? "left-0" : "right-0"
          } ${dragging ? "opacity-100" : "opacity-0 group-hover/resize:opacity-100"}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-maroon/70">
            <path d={imageFloat === "right" ? "M0 10L10 0M0 6L6 0M0 2L2 0" : "M10 10L0 0M10 6L4 0M10 2L8 0"} stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ScaleRow (inline S/M/L/XL picker for settings popup)              */
/* ------------------------------------------------------------------ */

function ScaleRow({ label, current, onChange }: { label: string; current: string; onChange: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-headline text-[12px] text-caption">{label}</span>
      <div className="flex border border-neutral-200">
        {["S", "M", "L", "XL"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`cursor-pointer px-2 py-1 font-headline text-[11px] transition-colors ${
              current === s ? "bg-ink text-white" : "text-caption hover:text-maroon"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SlotSettingsPopup                                                  */
/* ------------------------------------------------------------------ */

function SlotSettingsPopup({
  slot, groupId, pvLen, onPvLenChange, imgWidth, onImgWidthChange, staffMembers, anchorRef, onClose,
}: {
  slot: SlotData; groupId: string; pvLen: number; onPvLenChange: (v: number) => void;
  imgWidth: number; onImgWidthChange: (w: number) => void;
  staffMembers: { id: string; name: string }[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHeadline = slot.slotRole === "headline";
  const isImageSlot = slot.slotRole === "image" || slot.slotRole === "media";
  const isArticleSlot = !isImageSlot;
  const hasImage = !!slot.mediaUrl || isImageSlot;
  const [showAdvancedCrop, setShowAdvancedCrop] = useState(false);
  const [customRatio, setCustomRatio] = useState(slot.imageCropCustom ?? "16:9");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const popH = ref.current?.offsetHeight ?? 300;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const top = spaceBelow >= popH ? r.bottom + 4 : Math.max(8, r.top - popH - 4);
    const left = Math.max(8, Math.min(r.right - 240, window.innerWidth - 252));
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    reposition();
  }, [reposition]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          !(anchorRef.current && anchorRef.current.contains(e.target as Node))) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  function commitPvLen(v: number) {
    const clamped = Math.max(50, Math.min(500, v));
    onPvLenChange(clamped);
    updateSlotPreviewLength(slot.id, clamped, groupId);
  }

  function commitImgWidth(v: number) {
    const clamped = Math.max(10, Math.min(100, v));
    onImgWidthChange(clamped);
    updateImageWidth(slot.id, clamped, groupId);
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-neutral-200 shadow-lg rounded-sm p-3.5 space-y-3 min-w-[240px] max-h-[80vh] overflow-y-auto"
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ===== IMAGE SETTINGS (any slot with an image) ===== */}
      {hasImage && (
        <>
          {/* Image position */}
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Position</span>
            <div className="flex border border-neutral-200">
              {(["left", "full", "right"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => updateImageFloat(slot.id, f, groupId)}
                  className={`cursor-pointer px-2.5 py-1 font-headline text-[11px] transition-colors ${
                    (slot.imageFloat ?? "full") === f ? "bg-ink text-white" : "text-caption hover:text-maroon"
                  }`}
                >
                  {f === "left" ? "Left" : f === "right" ? "Right" : "Full"}
                </button>
              ))}
            </div>
          </div>

          {/* Image width (only when floated) */}
          {(slot.imageFloat ?? "full") !== "full" && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-[12px] text-caption">Width</span>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-[11px] text-caption w-[28px] text-right">{imgWidth}%</span>
                <input
                  type="range" min="10" max="80" step="5" value={imgWidth}
                  onChange={(e) => onImgWidthChange(parseInt(e.target.value, 10))}
                  onMouseUp={() => commitImgWidth(imgWidth)}
                  onTouchEnd={() => commitImgWidth(imgWidth)}
                  className="w-[80px] h-[12px] accent-maroon"
                />
              </div>
            </div>
          )}

          {/* S/M/L/XL width presets */}
          <ScaleRow
            label="Quick size"
            current={slot.imageScale ?? "M"}
            onChange={(s) => {
              updateSlotImageScale(slot.id, s, groupId);
              const widthMap: Record<string, number> = { S: 25, M: 50, L: 75, XL: 100 };
              const newW = widthMap[s] ?? 50;
              onImgWidthChange(newW);
              updateImageWidth(slot.id, newW, groupId);
              if (s === "XL") updateImageFloat(slot.id, "full", groupId);
            }}
          />

          {/* Crop */}
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Crop</span>
            <div className="flex border border-neutral-200">
              {(["original", "landscape", "portrait", "square"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateImageCrop(slot.id, c, null, groupId)}
                  className={`cursor-pointer px-1.5 py-1 font-headline text-[10px] transition-colors ${
                    (slot.imageCrop ?? "original") === c ? "bg-ink text-white" : "text-caption hover:text-maroon"
                  }`}
                >
                  {c === "original" ? "Orig" : c === "landscape" ? "16:9" : c === "portrait" ? "3:4" : "1:1"}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced crop */}
          <button
            type="button"
            onClick={() => setShowAdvancedCrop(!showAdvancedCrop)}
            className="cursor-pointer font-headline text-[11px] text-caption/60 hover:text-maroon transition-colors"
          >
            {showAdvancedCrop ? "Hide advanced" : "Advanced crop..."}
          </button>
          {showAdvancedCrop && (
            <div className="flex items-center gap-1.5 pl-2">
              <span className="font-headline text-[11px] text-caption">Custom</span>
              <input
                type="text"
                value={customRatio}
                onChange={(e) => setCustomRatio(e.target.value)}
                placeholder="16:9"
                className="w-[48px] font-headline text-[11px] text-center border border-neutral-200 py-0.5 px-1 outline-none focus:border-maroon"
              />
              <button
                type="button"
                onClick={() => updateImageCrop(slot.id, "custom", customRatio, groupId)}
                className={`cursor-pointer font-headline text-[10px] px-2 py-0.5 border transition-colors ${
                  slot.imageCrop === "custom" ? "border-maroon text-maroon bg-maroon/5" : "border-neutral-200 text-caption hover:text-maroon"
                }`}
              >
                Apply
              </button>
            </div>
          )}

          {/* Credit */}
          <CreditSearch
            current={slot.mediaCredit ?? ""}
            staffMembers={staffMembers}
            onSelect={(name) => updateMediaCredit(slot.id, name, groupId)}
          />
        </>
      )}

      {/* ===== ARTICLE SLOT SETTINGS ===== */}
      {isArticleSlot && (
        <>
          <ScaleRow label="Text size" current={slot.scale ?? "M"} onChange={(s) => updateSlotScale(slot.id, s, groupId)} />
          {!isHeadline && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-[12px] text-caption">Preview length</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={50}
                  max={500}
                  step={10}
                  value={pvLen}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onPvLenChange(v); }}
                  onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) commitPvLen(v); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = parseInt((e.target as HTMLInputElement).value, 10); if (!isNaN(v)) commitPvLen(v); } }}
                  className="w-[42px] font-headline text-[11px] text-center border border-neutral-200 py-0.5 px-0.5 outline-none focus:border-maroon"
                />
                <input
                  type="range" min="50" max="500" step="10" value={pvLen}
                  onChange={(e) => onPvLenChange(parseInt(e.target.value, 10))}
                  onMouseUp={() => updateSlotPreviewLength(slot.id, pvLen, groupId)}
                  onTouchEnd={() => updateSlotPreviewLength(slot.id, pvLen, groupId)}
                  className="w-[70px] h-[12px] accent-maroon"
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Featured</span>
            <button
              type="button"
              onClick={() => toggleSlotFeatured(slot.id, !slot.featured, groupId)}
              className={`cursor-pointer font-headline text-[11px] px-2.5 py-1 border transition-colors ${
                slot.featured ? "border-maroon text-maroon bg-maroon/5" : "border-neutral-200 text-caption hover:text-maroon"
              }`}
            >
              {slot.featured ? "On" : "Off"}
            </button>
          </div>
          {isHeadline && (
            <div className="flex items-center justify-between">
              <span className="font-headline text-[12px] text-caption">Show author</span>
              <button
                type="button"
                onClick={() => toggleSlotByline(slot.id, !slot.showByline, groupId)}
                className={`cursor-pointer font-headline text-[11px] px-2.5 py-1 border transition-colors ${
                  slot.showByline ? "border-maroon text-maroon bg-maroon/5" : "border-neutral-200 text-caption hover:text-maroon"
                }`}
              >
                {slot.showByline ? "On" : "Off"}
              </button>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  CogButton                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  CreditSearch — search dropdown for image credit (compact)          */
/* ------------------------------------------------------------------ */

function CreditSearch({
  current,
  staffMembers,
  onSelect,
}: {
  current: string;
  staffMembers: { id: string; name: string }[];
  onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.length > 0
    ? staffMembers.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    : staffMembers;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <span className="font-headline text-[12px] text-caption">Credit</span>
        {current ? (
          <div className="flex items-center gap-1">
            <span className="font-headline text-[11px] text-maroon font-semibold">{current}</span>
            <button
              type="button"
              onClick={() => onSelect("")}
              className="cursor-pointer text-caption/40 hover:text-maroon transition-colors text-[13px] px-0.5"
            >
              &times;
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search staff..."
            className="w-[120px] border border-neutral-200 px-2 py-0.5 font-headline text-[11px] tracking-wide placeholder:text-caption/30 outline-none focus:border-maroon"
          />
        )}
      </div>
      {open && !current && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-40 max-h-32 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(m.name); setQuery(""); setOpen(false); }}
              className="cursor-pointer w-full text-left px-3 py-1.5 font-headline text-[11px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors"
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CogButton                                                          */
/* ------------------------------------------------------------------ */

function CogButton({ onClick, buttonRef, className = "" }: { onClick: () => void; buttonRef?: React.RefObject<HTMLButtonElement | null>; className?: string }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors ${className}`}
      title="Slot settings"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SlotView                                                           */
/* ------------------------------------------------------------------ */

function SlotView({
  slot,
  slotLabel,
  groupId,
  availableArticles,
  staffMembers,
  opacity,
  showImage,
  imagePosition,
  size,
}: {
  slot: SlotData;
  slotLabel: string;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  opacity: number;
  showImage?: boolean;
  imagePosition?: "top" | "left" | "thumbnail";
  size?: "sm" | "md" | "lg";
}) {
  const [popupType, setPopupType] = useState<"article" | "media" | "settings" | null>(null);
  const cogRef = useRef<HTMLButtonElement>(null);
  const [pvLen, setPvLen] = useState(Number(slot.previewLength) || 200);
  const [imgWidth, setImgWidth] = useState(slot.imageWidth ?? 100);
  const isMedia = slot.slotRole === "image" || slot.slotRole === "media";
  const isHeadline = slot.slotRole === "headline";
  const cropRatio = parseCropRatio(slot.imageCrop ?? "original", slot.imageCropCustom ?? null);

  const effectiveSize = size ?? "lg";
  const sf = SCALE_FACTORS[slot.scale ?? "M"] ?? 1;
  const imgSf = SCALE_FACTORS[slot.imageScale ?? "M"] ?? 1;

  const titlePx = Math.round((effectiveSize === "sm" ? 16 : effectiveSize === "md" ? 20 : 28) * sf);
  const headlinePx = Math.round((effectiveSize === "sm" ? 16 : effectiveSize === "md" ? 18 : 26) * sf);
  const excerptPx = Math.round((effectiveSize === "sm" ? 13 : effectiveSize === "md" ? 15 : 16) * sf);
  const bylinePx = Math.round((effectiveSize === "sm" ? 12 : effectiveSize === "md" ? 13 : 14) * sf);
  const sectionPx = Math.round((effectiveSize === "sm" ? 12 : effectiveSize === "md" ? 13 : 14) * sf);

  const author = slot.article ? getAuthorInfo(slot.article) : null;

  const PLACEHOLDER_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
  const rawText = slot.article?.body ?? PLACEHOLDER_TEXT;
  const stripped = rawText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const previewText = stripped.length > pvLen ? stripped.slice(0, pvLen).replace(/\s+\S*$/, "") + "..." : stripped;
  const showExcerpt = effectiveSize !== "sm";

  /* Byline — shown for non-headline slots always, or for headline slots when toggled on */
  const bylineEl = author && (slot.showByline || !isHeadline) ? (
    <p className="font-headline mt-2" style={{ fontSize: bylinePx }}>
      <span className="text-maroon font-semibold">{author.name}</span>{" "}
      <span className="italic text-caption">{author.role}</span>
    </p>
  ) : null;

  /* Settings cog + popup overlay for filled article slots (used by no-image slots) */
  const settingsOverlay = slot.article ? (
    <>
      <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-20">
        <CogButton buttonRef={cogRef} onClick={() => setPopupType(popupType === "settings" ? null : "settings")} />
        <button
          type="button"
          onClick={() => clearBlockSlot(slot.id, groupId)}
          className="cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[13px]"
        >
          &times;
        </button>
      </div>
      {popupType === "settings" && (
        <SlotSettingsPopup slot={slot} groupId={groupId} pvLen={pvLen} onPvLenChange={setPvLen} imgWidth={imgWidth} onImgWidthChange={setImgWidth} staffMembers={staffMembers} anchorRef={cogRef} onClose={() => setPopupType(null)} />
      )}
    </>
  ) : null;

  /* ---- Pure media slot (hero image, text-images, etc.) ---- */
  if (isMedia) {
    if (slot.mediaUrl) {
      return (
        <div className="relative group/slot">
          <ResizableImage
            src={slot.mediaUrl}
            alt={slot.mediaAlt ?? ""}
            credit={slot.mediaCredit}
            imageFloat={slot.imageFloat ?? "full"}
            imageWidth={imgWidth}
            cropRatio={cropRatio}
            onWidthChange={setImgWidth}
            onWidthCommit={(w) => updateImageWidth(slot.id, w, groupId)}
            onFloatChange={(f) => updateImageFloat(slot.id, f, groupId)}
          />
          <div className="absolute top-1 right-8 flex items-center gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-20">
            <CogButton buttonRef={cogRef} onClick={() => setPopupType(popupType === "settings" ? null : "settings")} />
            <button
              type="button"
              onClick={() => clearBlockSlot(slot.id, groupId)}
              className="cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[13px]"
            >
              &times;
            </button>
          </div>
          {popupType === "settings" && (
            <SlotSettingsPopup slot={slot} groupId={groupId} pvLen={pvLen} onPvLenChange={setPvLen} imgWidth={imgWidth} onImgWidthChange={setImgWidth} staffMembers={staffMembers} anchorRef={cogRef} onClose={() => setPopupType(null)} />
          )}
        </div>
      );
    }
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPopupType(popupType === "media" ? null : "media")}
          className="cursor-pointer w-full text-left transition-all hover:outline hover:outline-2 hover:outline-maroon/40 hover:bg-maroon/5 rounded-sm"
        >
          <div className="bg-neutral-200 w-full flex items-center justify-center" style={{ minHeight: Math.round(100 * imgSf) }}>
            <span className="font-headline text-[11px] text-neutral-400">{slotLabel}</span>
          </div>
        </button>
        {popupType === "media" && (
          <MediaUploadPopup slotId={slot.id} groupId={groupId} onClose={() => setPopupType(null)} />
        )}
      </div>
    );
  }

  /* ---- Article slot with image area ---- */
  if (showImage) {
    const iFloat = slot.imageFloat ?? "full";
    const isFloated = iFloat === "left" || iFloat === "right";

    const baseImgH = imagePosition === "thumbnail" ? 40 : imagePosition === "left" ? 60 : effectiveSize === "sm" ? 80 : effectiveSize === "md" ? 150 : 200;
    const baseImgW = imagePosition === "thumbnail" ? 40 : imagePosition === "left" ? 60 : undefined;
    const imgH = Math.round(baseImgH * imgSf);
    const imgW = baseImgW ? Math.round(baseImgW * imgSf) : undefined;

    const imageArea = slot.mediaUrl ? (
      isFloated ? (
        <ResizableImage
          src={slot.mediaUrl}
          alt={slot.mediaAlt ?? ""}
          credit={slot.mediaCredit}
          imageFloat={iFloat}
          imageWidth={imgWidth}
          cropRatio={cropRatio}
          onWidthChange={setImgWidth}
          onWidthCommit={(w) => updateImageWidth(slot.id, w, groupId)}
          onFloatChange={(f) => updateImageFloat(slot.id, f, groupId)}
        />
      ) : (
        <div className="relative group/img shrink-0 overflow-hidden" style={{ width: imgW ?? "100%", ...(cropRatio ? { aspectRatio: String(cropRatio) } : { height: imgH }) }}>
          <img src={slot.mediaUrl} alt={slot.mediaAlt ?? ""} className="w-full h-full object-cover bg-neutral-100" />
          {slot.mediaCredit && (
            <span className="absolute bottom-1 right-1 font-headline text-[9px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
          )}
          <button
            type="button"
            onClick={() => clearSlotMedia(slot.id, groupId)}
            className="cursor-pointer absolute top-1 right-1 bg-white/90 border border-ink/10 w-5 h-5 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[11px] opacity-0 group-hover/img:opacity-100"
          >
            &times;
          </button>
        </div>
      )
    ) : (
      <button
        type="button"
        onClick={() => setPopupType(popupType === "media" ? null : "media")}
        className="cursor-pointer shrink-0 bg-neutral-200 flex items-center justify-center hover:bg-neutral-300 transition-colors"
        style={{ width: imgW ?? "100%", height: imgH }}
      >
        <span className="font-headline text-[10px] text-neutral-400">+ img</span>
      </button>
    );

    const filledArticle = slot.article ? (
      isHeadline ? (
        <div className="py-1">
          <p className="font-headline font-bold leading-snug" style={{ fontSize: headlinePx }}>{slot.article.title}</p>
          {bylineEl}
        </div>
      ) : (
        <div className="py-1">
          <p className="font-headline text-maroon italic" style={{ fontSize: sectionPx }}>{SECTION_LABELS[slot.article.section] ?? slot.article.section}</p>
          <p className="font-headline font-bold leading-snug mt-1" style={{ fontSize: titlePx }}>{slot.article.title}</p>
          {showExcerpt && imagePosition !== "thumbnail" && (
            <p className="leading-[1.65] text-caption mt-2" style={{ fontSize: excerptPx }}>{previewText}</p>
          )}
          {bylineEl}
        </div>
      )
    ) : null;

    const placeholderArticle = (
      <div style={{ opacity }} className="py-1">
        {imagePosition === "thumbnail" ? (
          <p className="font-headline font-bold leading-snug" style={{ fontSize: titlePx }}>Lorem Ipsum Dolor Sit</p>
        ) : imagePosition === "left" ? (
          <>
            <p className="font-headline font-bold leading-snug" style={{ fontSize: titlePx }}>Lorem Ipsum Dolor Sit Amet</p>
            <p className="text-caption mt-1" style={{ fontSize: excerptPx }}>{previewText}</p>
          </>
        ) : (
          <>
            <p className="font-headline text-maroon italic" style={{ fontSize: sectionPx }}>News</p>
            <p className="font-headline font-bold leading-snug mt-1" style={{ fontSize: titlePx }}>Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing</p>
            {showExcerpt && (
              <p className="leading-[1.65] text-caption mt-2" style={{ fontSize: excerptPx }}>
                {previewText}
              </p>
            )}
            <p className="font-headline mt-2" style={{ fontSize: bylinePx }}>
              <span className="text-maroon font-semibold">By Author</span>{" "}
              <span className="italic">Staff Writer</span>
            </p>
          </>
        )}
      </div>
    );

    /* Slot-level cog overlay — visible on hover over the entire slot */
    const slotCogOverlay = slot.article ? (
      <>
        <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-20">
          <CogButton buttonRef={cogRef} onClick={() => setPopupType(popupType === "settings" ? null : "settings")} />
          <button
            type="button"
            onClick={() => showImage ? clearSlotArticle(slot.id, groupId) : clearBlockSlot(slot.id, groupId)}
            className="cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[13px]"
          >
            &times;
          </button>
        </div>
        {popupType === "settings" && (
          <SlotSettingsPopup slot={slot} groupId={groupId} pvLen={pvLen} onPvLenChange={setPvLen} imgWidth={imgWidth} onImgWidthChange={setImgWidth} staffMembers={staffMembers} anchorRef={cogRef} onClose={() => setPopupType(null)} />
        )}
      </>
    ) : null;

    /* When floated, image + text are in a flow container (text wraps around image) */
    if (isFloated && slot.mediaUrl) {
      const textContent = slot.article ? (
        <div>
          {slot.featured && <span className="block font-headline text-[9px] tracking-[0.08em] uppercase text-white font-semibold bg-maroon px-1.5 py-0.5 w-fit mb-0.5">Featured</span>}
          {filledArticle}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPopupType(popupType === "article" ? null : "article")}
          className="cursor-pointer text-left w-full transition-all hover:outline hover:outline-2 hover:outline-maroon/40 hover:bg-maroon/5 rounded-sm"
        >
          {placeholderArticle}
        </button>
      );

      return (
        <div className="relative overflow-hidden group/slot">
          {imageArea}
          {textContent}
          <div style={{ clear: "both" }} />
          {slotCogOverlay}
          {popupType === "article" && (
            <SlotAssignPopup slotId={slot.id} groupId={groupId} availableArticles={availableArticles} onClose={() => setPopupType(null)} />
          )}
          {popupType === "media" && (
            <MediaUploadPopup slotId={slot.id} groupId={groupId} onClose={() => setPopupType(null)} />
          )}
        </div>
      );
    }

    const textArea = slot.article ? (
      <div className="min-w-0 flex-1">
        {slot.featured && <span className="block font-headline text-[9px] tracking-[0.08em] uppercase text-white font-semibold bg-maroon px-1.5 py-0.5 w-fit mb-0.5">Featured</span>}
        {filledArticle}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setPopupType(popupType === "article" ? null : "article")}
        className="cursor-pointer text-left min-w-0 flex-1 transition-all hover:outline hover:outline-2 hover:outline-maroon/40 hover:bg-maroon/5 rounded-sm"
      >
        {placeholderArticle}
      </button>
    );

    const content = imagePosition === "thumbnail" || imagePosition === "left" ? (
      <div className="flex gap-2 items-start">{imageArea}{textArea}</div>
    ) : (
      <div>{imageArea}<div className="mt-2">{textArea}</div></div>
    );

    return (
      <div className="relative group/slot">
        {content}
        {slotCogOverlay}
        {popupType === "article" && (
          <SlotAssignPopup slotId={slot.id} groupId={groupId} availableArticles={availableArticles} onClose={() => setPopupType(null)} />
        )}
        {popupType === "media" && (
          <MediaUploadPopup slotId={slot.id} groupId={groupId} onClose={() => setPopupType(null)} />
        )}
      </div>
    );
  }

  /* ---- Article/headline slot without image ---- */

  if (slot.article) {
    const articleContent = isHeadline ? (
      <div className="py-1">
        <p className="font-headline font-bold leading-snug" style={{ fontSize: headlinePx }}>{slot.article.title}</p>
        {bylineEl}
      </div>
    ) : (
      <div className="py-1">
        <p className="font-headline text-maroon italic" style={{ fontSize: sectionPx }}>{SECTION_LABELS[slot.article.section] ?? slot.article.section}</p>
        <p className="font-headline font-bold leading-snug mt-1" style={{ fontSize: titlePx }}>{slot.article.title}</p>
        {showExcerpt && (
          <p className="leading-[1.65] text-caption mt-2" style={{ fontSize: excerptPx }}>
            {previewText}
          </p>
        )}
        {bylineEl}
      </div>
    );

    return (
      <div className="relative group/slot">
        {slot.featured && <span className="block font-headline text-[9px] tracking-[0.08em] uppercase text-white font-semibold bg-maroon px-1.5 py-0.5 w-fit mb-0.5">Featured</span>}
        {articleContent}
        {settingsOverlay}
      </div>
    );
  }

  if (slot.mediaUrl) {
    return (
      <div className="relative group/slot">
        <img src={slot.mediaUrl} alt={slot.mediaAlt ?? ""} className="w-full h-full object-cover bg-neutral-100" style={{ minHeight: Math.round(80 * imgSf) }} />
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => clearBlockSlot(slot.id, groupId)}
            className="cursor-pointer bg-white/90 border border-ink/10 w-5 h-5 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[12px]"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPopupType(popupType === "article" ? null : "article")}
        className="cursor-pointer w-full text-left transition-all hover:outline hover:outline-2 hover:outline-maroon/40 hover:bg-maroon/5 rounded-sm"
      >
        {isHeadline ? (
          <div className="py-1" style={{ opacity }}>
            <p className="font-headline font-bold leading-snug" style={{ fontSize: headlinePx }}>Lorem Ipsum Dolor Sit Amet Consectetur</p>
          </div>
        ) : (
          <div style={{ opacity }}>
            <div className="py-1">
              <p className="font-headline text-maroon italic" style={{ fontSize: sectionPx }}>News</p>
              <p className="font-headline font-bold leading-snug mt-1" style={{ fontSize: titlePx }}>Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing</p>
              {showExcerpt && (
                <p className="leading-[1.65] text-caption mt-2" style={{ fontSize: excerptPx }}>{previewText}</p>
              )}
              <p className="font-headline mt-2" style={{ fontSize: bylinePx }}><span className="text-maroon font-semibold">By Author</span> <span className="italic">Staff Writer</span></p>
            </div>
          </div>
        )}
      </button>
      {popupType === "article" && (
        <SlotAssignPopup slotId={slot.id} groupId={groupId} availableArticles={availableArticles} onClose={() => setPopupType(null)} />
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
