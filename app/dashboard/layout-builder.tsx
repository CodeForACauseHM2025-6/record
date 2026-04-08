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
import { EditorProvider } from "@/app/patterns/editor-context";
import { PatternRenderer } from "@/app/patterns/pattern-renderer";
import { BlockData, PopulatedSlot } from "@/app/patterns/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SlotData {
  id: string;
  slotRole: string;
  order: number;
  articleId: string | null;
  article: {
    id: string;
    title: string;
    slug?: string;
    section: string;
    body: string;
    featuredImage?: string | null;
    publishedAt?: Date | null;
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toBlockData(block: BlockWithSlots): BlockData {
  return {
    id: block.id,
    pattern: block.pattern,
    order: block.order,
    dividerStyle: block.dividerStyle,
    slots: block.slots.map(
      (s): PopulatedSlot => ({
        id: s.id,
        slotRole: s.slotRole,
        order: s.order,
        article: s.article
          ? {
              id: s.article.id,
              title: s.article.title,
              slug: s.article.slug ?? s.article.id,
              body: s.article.body,
              section: s.article.section,
              featuredImage: s.article.featuredImage ?? null,
              publishedAt: s.article.publishedAt ?? null,
              createdBy: s.article.createdBy,
              credits: s.article.credits ?? [],
            }
          : null,
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
      }),
    ),
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
    <EditorProvider
      value={{
        groupId,
        availableArticles,
        staffMembers,
        placeholderOpacity,
      }}
    >
      <div
        className="flex flex-col lg:flex-row"
        // Block in-pattern Link clicks from navigating away while editing
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a")) {
            e.preventDefault();
          }
        }}
      >
        {/* Main column */}
        <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
          {pickingColumn === "sidebar" ? (
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
              onStartPick={() => setPickingColumn("main")}
              isPicking={pickingColumn === "main"}
              previewId={pickingColumn === "main" ? previewId : null}
            />
          )}
        </div>

        {/* Sidebar column */}
        <div className="lg:flex-[1] lg:pl-8 mt-8 lg:mt-0 border-t lg:border-t-0 border-neutral-200 pt-8 lg:pt-0">
          {pickingColumn === "main" ? (
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
              onStartPick={() => setPickingColumn("sidebar")}
              isPicking={pickingColumn === "sidebar"}
              previewId={pickingColumn === "sidebar" ? previewId : null}
            />
          )}
        </div>
      </div>
    </EditorProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  ColumnView                                                         */
/* ------------------------------------------------------------------ */

function ColumnView({
  groupId,
  column,
  blocks,
  onStartPick,
  isPicking,
  previewId,
}: {
  groupId: string;
  column: "main" | "sidebar";
  blocks: BlockWithSlots[];
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
          />
          {i < blocks.length - 1 && block.dividerStyle !== "none" && (
            <div
              className={`my-6 ${
                block.dividerStyle === "bold" ? "h-[2px] bg-ink" : "h-px bg-neutral-200"
              }`}
            />
          )}
        </div>
      ))}

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
    <div className="sticky top-12 z-30 bg-white pt-3 pb-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
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
            <span className="block font-headline text-[12px] text-caption mt-0.5">
              {p.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BlockView — block-level chrome (move/delete/divider) + pattern     */
/* ------------------------------------------------------------------ */

function BlockView({
  block,
  groupId,
  column,
  allBlocks,
  index,
}: {
  block: BlockWithSlots;
  groupId: string;
  column: "main" | "sidebar";
  allBlocks: BlockWithSlots[];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
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

      <PatternRenderer block={toBlockData(block)} editMode />
    </div>
  );
}
