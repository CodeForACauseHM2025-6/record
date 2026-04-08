"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  clearBlockSlot,
  clearSlotArticle,
  clearSlotMedia,
  updateSlotScale,
  updateSlotImageScale,
  updateSlotPreviewLength,
  toggleSlotFeatured,
  toggleSlotByline,
  updateImageFloat,
  updateImageWidth,
  updateImageCrop,
  updateMediaCredit,
  assignToBlockSlot,
  assignMediaToBlockSlot,
} from "@/app/dashboard/group-actions";
import type { PopulatedSlot } from "@/app/patterns/types";

/* ------------------------------------------------------------------ */
/*  SlotSettingsPopup (shared)                                         */
/* ------------------------------------------------------------------ */

/* Re-exported from layout-builder — these are passed via props */

interface EditableSlotProps {
  slot: PopulatedSlot;
  slotIndex: number;
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  children: React.ReactNode;
}

/**
 * Wraps a pattern slot's rendered content with editing controls.
 * When the slot has content, shows cog + X on hover.
 * When empty, makes the area clickable to assign content.
 */
export function EditableSlot({
  slot,
  slotIndex,
  groupId,
  availableArticles,
  staffMembers,
  children,
}: EditableSlotProps) {
  const [popupType, setPopupType] = useState<"article" | "media" | "settings" | null>(null);
  const cogRef = useRef<HTMLButtonElement>(null);
  const isMedia = slot.slotRole === "image" || slot.slotRole === "media";
  const hasContent = isMedia ? !!slot.mediaUrl : !!slot.article;

  if (!hasContent) {
    // Empty slot — clickable placeholder
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPopupType(isMedia ? "media" : "article")}
          className="cursor-pointer w-full h-full min-h-[60px] border border-dashed border-neutral-300 flex items-center justify-center hover:border-maroon hover:bg-maroon/5 transition-colors"
        >
          <span className="font-headline text-[11px] text-neutral-400">
            {isMedia ? "+ Add Image" : "+ Add Article"}
          </span>
        </button>
        {popupType === "article" && (
          <ArticlePicker
            availableArticles={availableArticles}
            onSelect={async (articleId) => { setPopupType(null); await assignToBlockSlot(slot.id, articleId, groupId); }}
            onClose={() => setPopupType(null)}
          />
        )}
        {popupType === "media" && (
          <MediaPicker
            slotId={slot.id}
            groupId={groupId}
            onClose={() => setPopupType(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative group/slot">
      {children}
      {/* Hover controls */}
      <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-20">
        <button
          ref={cogRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setPopupType(popupType === "settings" ? null : "settings"); }}
          className="cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors"
          title="Slot settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => isMedia ? clearSlotMedia(slot.id, groupId) : clearBlockSlot(slot.id, groupId)}
          className="cursor-pointer bg-white/90 border border-ink/10 w-6 h-6 flex items-center justify-center text-caption hover:text-maroon transition-colors text-[13px]"
        >
          &times;
        </button>
      </div>
      {popupType === "settings" && (
        <SlotSettingsInline
          slot={slot}
          groupId={groupId}
          staffMembers={staffMembers}
          anchorRef={cogRef}
          onClose={() => setPopupType(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline settings popup (simplified from SlotSettingsPopup)          */
/* ------------------------------------------------------------------ */

function SlotSettingsInline({
  slot,
  groupId,
  staffMembers,
  anchorRef,
  onClose,
}: {
  slot: PopulatedSlot;
  groupId: string;
  staffMembers: { id: string; name: string }[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHeadline = slot.slotRole === "headline";
  const isImageSlot = slot.slotRole === "image" || slot.slotRole === "media";
  const isArticleSlot = !isImageSlot;
  const hasImage = !!slot.mediaUrl || isImageSlot;
  const [pvLen, setPvLen] = useState(Number(slot.previewLength) || 200);
  const [imgWidth, setImgWidth] = useState(slot.imageWidth ?? 100);
  const [showAdvancedCrop, setShowAdvancedCrop] = useState(false);
  const [customRatio, setCustomRatio] = useState(slot.imageCropCustom ?? "16:9");

  // Position near the anchor button
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

  useEffect(() => { reposition(); }, [reposition]);

  // Close on outside click
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
    setPvLen(clamped);
    updateSlotPreviewLength(slot.id, clamped, groupId);
  }

  function commitImgWidth(v: number) {
    const clamped = Math.max(10, Math.min(100, v));
    setImgWidth(clamped);
    updateImageWidth(slot.id, clamped, groupId);
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-neutral-200 shadow-lg rounded-sm p-3.5 space-y-3 min-w-[240px] max-h-[80vh] overflow-y-auto"
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasImage && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Position</span>
            <div className="flex border border-neutral-200">
              {(["left", "full", "right"] as const).map((f) => (
                <button key={f} type="button" onClick={() => updateImageFloat(slot.id, f, groupId)}
                  className={`cursor-pointer px-2.5 py-1 font-headline text-[11px] transition-colors ${
                    (slot.imageFloat ?? "full") === f ? "bg-ink text-white" : "text-caption hover:text-maroon"
                  }`}
                >{f === "left" ? "Left" : f === "right" ? "Right" : "Full"}</button>
              ))}
            </div>
          </div>
          {(slot.imageFloat ?? "full") !== "full" && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-[12px] text-caption">Width</span>
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-[11px] text-caption w-[28px] text-right">{imgWidth}%</span>
                <input type="range" min="10" max="80" step="5" value={imgWidth}
                  onChange={(e) => setImgWidth(parseInt(e.target.value, 10))}
                  onMouseUp={() => commitImgWidth(imgWidth)}
                  onTouchEnd={() => commitImgWidth(imgWidth)}
                  className="w-[80px] h-[12px] accent-maroon"
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Crop</span>
            <div className="flex border border-neutral-200">
              {(["original", "landscape", "portrait", "square"] as const).map((c) => (
                <button key={c} type="button" onClick={() => updateImageCrop(slot.id, c, null, groupId)}
                  className={`cursor-pointer px-1.5 py-1 font-headline text-[10px] transition-colors ${
                    (slot.imageCrop ?? "original") === c ? "bg-ink text-white" : "text-caption hover:text-maroon"
                  }`}
                >{c === "original" ? "Orig" : c === "landscape" ? "16:9" : c === "portrait" ? "3:4" : "1:1"}</button>
              ))}
            </div>
          </div>
          <CreditSearchInline
            current={slot.mediaCredit ?? ""}
            staffMembers={staffMembers}
            onSelect={(name) => updateMediaCredit(slot.id, name, groupId)}
          />
        </>
      )}
      {isArticleSlot && (
        <>
          <ScaleRowInline label="Text size" current={slot.scale ?? "M"} onChange={(s) => updateSlotScale(slot.id, s, groupId)} />
          {!isHeadline && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-[12px] text-caption">Preview length</span>
              <div className="flex items-center gap-1.5">
                <input type="number" min={50} max={500} step={10} value={pvLen}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setPvLen(v); }}
                  onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) commitPvLen(v); }}
                  className="w-[42px] font-headline text-[11px] text-center border border-neutral-200 py-0.5 px-0.5 outline-none focus:border-maroon"
                />
                <input type="range" min="50" max="500" step="10" value={pvLen}
                  onChange={(e) => setPvLen(parseInt(e.target.value, 10))}
                  onMouseUp={() => updateSlotPreviewLength(slot.id, pvLen, groupId)}
                  onTouchEnd={() => updateSlotPreviewLength(slot.id, pvLen, groupId)}
                  className="w-[70px] h-[12px] accent-maroon"
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-headline text-[12px] text-caption">Featured</span>
            <button type="button" onClick={() => toggleSlotFeatured(slot.id, !slot.featured, groupId)}
              className={`cursor-pointer font-headline text-[11px] px-2.5 py-1 border transition-colors ${
                slot.featured ? "border-maroon text-maroon bg-maroon/5" : "border-neutral-200 text-caption hover:text-maroon"
              }`}
            >{slot.featured ? "On" : "Off"}</button>
          </div>
          {isHeadline && (
            <div className="flex items-center justify-between">
              <span className="font-headline text-[12px] text-caption">Show author</span>
              <button type="button" onClick={() => toggleSlotByline(slot.id, !slot.showByline, groupId)}
                className={`cursor-pointer font-headline text-[11px] px-2.5 py-1 border transition-colors ${
                  slot.showByline ? "border-maroon text-maroon bg-maroon/5" : "border-neutral-200 text-caption hover:text-maroon"
                }`}
              >{slot.showByline ? "On" : "Off"}</button>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Small inline helpers                                               */
/* ------------------------------------------------------------------ */

function ScaleRowInline({ label, current, onChange }: { label: string; current: string; onChange: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-headline text-[12px] text-caption">{label}</span>
      <div className="flex border border-neutral-200">
        {["S", "M", "L", "XL"].map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`cursor-pointer px-2 py-1 font-headline text-[11px] transition-colors ${
              current === s ? "bg-ink text-white" : "text-caption hover:text-maroon"
            }`}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}

function CreditSearchInline({ current, staffMembers, onSelect }: {
  current: string; staffMembers: { id: string; name: string }[]; onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
            <button type="button" onClick={() => onSelect("")}
              className="cursor-pointer text-caption/40 hover:text-maroon transition-colors text-[13px] px-0.5"
            >&times;</button>
          </div>
        ) : (
          <input type="text" value={query}
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
            <button key={m.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(m.name); setQuery(""); setOpen(false); }}
              className="cursor-pointer w-full text-left px-3 py-1.5 font-headline text-[11px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors"
            >{m.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Article & Media pickers                                            */
/* ------------------------------------------------------------------ */

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

function ArticlePicker({ availableArticles, onSelect, onClose }: {
  availableArticles: { id: string; title: string; section: string }[];
  onSelect: (articleId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useState(() => { inputRef.current?.focus(); });
  useState(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  });

  const filtered = query.length > 0
    ? availableArticles.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : availableArticles.slice(0, 8);

  return (
    <div ref={ref} className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-30">
      <div className="p-2 border-b border-neutral-100">
        <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full border border-ink/15 px-3 py-1.5 font-headline text-[13px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && <p className="px-3 py-3 font-headline text-[12px] text-caption/50 text-center">No articles found</p>}
        {filtered.map((a) => (
          <button key={a.id} type="button" onClick={() => onSelect(a.id)}
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

function MediaPicker({ slotId, groupId, onClose }: { slotId: string; groupId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState("");
  const MAX_FILE_SIZE = 30 * 1024 * 1024;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeError("");
    if (file.size > MAX_FILE_SIZE) {
      setSizeError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 30MB.`);
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
      <button type="button" onClick={() => fileRef.current?.click()}
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
