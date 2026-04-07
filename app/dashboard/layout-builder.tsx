"use client";

import { useState } from "react";
import {
  addBlock,
  deleteBlock,
  updateDividerStyle,
  reorderBlocks,
} from "@/app/dashboard/group-actions";
import { PATTERNS, getMainPatterns, getSidebarPatterns } from "@/lib/patterns";
import { PatternPreview } from "@/app/dashboard/pattern-previews";
import { PatternRenderer } from "@/app/patterns/pattern-renderer";
import { EditableSlot } from "@/app/dashboard/editable-slot";
import type { BlockData } from "@/app/patterns/types";

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

function toPopulatedSlot(s: SlotData): import("@/app/patterns/types").PopulatedSlot {
  return {
    id: s.id,
    slotRole: s.slotRole,
    order: s.order,
    article: s.article ? {
      id: s.article.id,
      title: s.article.title,
      slug: s.article.slug ?? s.article.id,
      body: s.article.body,
      section: s.article.section,
      featuredImage: s.article.featuredImage ?? null,
      publishedAt: s.article.publishedAt ?? null,
      createdBy: s.article.createdBy,
      credits: s.article.credits ?? [],
    } : null,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    mediaAlt: s.mediaAlt,
    mediaCredit: s.mediaCredit,
    scale: s.scale,
    imageScale: s.imageScale,
    previewLength: s.previewLength,
    featured: s.featured,
    showByline: s.showByline,
    imageFloat: s.imageFloat,
    imageWidth: s.imageWidth,
    imageCrop: s.imageCrop,
    imageCropCustom: s.imageCropCustom,
  };
}

function toBlockData(b: BlockWithSlots): BlockData {
  return {
    id: b.id,
    pattern: b.pattern,
    order: b.order,
    dividerStyle: b.dividerStyle,
    slots: b.slots.map(toPopulatedSlot),
  };
}

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

      <PatternRenderer
        block={toBlockData(block)}
        wrapSlot={(slotIndex, content) => {
          const slot = block.slots[slotIndex];
          if (!slot) return content;
          return (
            <EditableSlot
              key={slot.id}
              slot={toPopulatedSlot(slot)}
              slotIndex={slotIndex}
              groupId={groupId}
              availableArticles={availableArticles}
              staffMembers={staffMembers}
            >
              {content}
            </EditableSlot>
          );
        }}
      />
    </div>
  );
}

/* Dead code removed — editor now uses PatternRenderer with wrapSlot */
/* PatternSlotLayout, SlotView, SlotAssignPopup, MediaUploadPopup,   */
/* ResizableImage, ScaleRow, SlotSettingsPopup, CreditSearch,        */
/* CogButton, parseCropRatio all moved to editable-slot.tsx or       */
/* eliminated by using shared pattern components.                     */
