"use client";

import { useState } from "react";
import {
  addBlock,
  deleteBlock,
  updateDividerStyle,
  reorderBlocks,
} from "@/app/dashboard/group-actions";
import { PATTERNS, getMainPatterns, getSidebarPatterns, getFullPatterns } from "@/lib/patterns";
import { EditorProvider } from "@/app/patterns/editor-context";
import { PatternRenderer } from "@/app/patterns/pattern-renderer";
import { BlockData, PopulatedSlot, RoundTableSummary } from "@/app/patterns/types";

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
  fullBlocks: BlockWithSlots[];
  roundTable: RoundTableSummary | null;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  placeholderOpacity?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toBlockData(block: BlockWithSlots, roundTable: RoundTableSummary | null): BlockData {
  const isRoundTable =
    block.pattern === "round-table" ||
    block.pattern === "sb-round-table" ||
    block.pattern === "round-table-full";
  return {
    id: block.id,
    pattern: block.pattern,
    order: block.order,
    dividerStyle: block.dividerStyle,
    roundTable: isRoundTable ? roundTable : undefined,
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

/**
 * Builds a synthetic BlockData for the picker preview: empty slots whose
 * defaults match a freshly-added BlockSlot row, so the pattern component
 * renders identically to the real block once added (its EditableSlot
 * wrappers will fill empties with getPlaceholderArticle() in editMode).
 */
function placeholderBlockData(patternId: string, roundTable: RoundTableSummary | null): BlockData | null {
  const def = PATTERNS[patternId];
  if (!def) return null;
  const isRoundTable =
    patternId === "round-table" ||
    patternId === "sb-round-table" ||
    patternId === "round-table-full";
  return {
    id: `preview-${patternId}`,
    pattern: patternId,
    order: 0,
    dividerStyle: "none",
    roundTable: isRoundTable ? roundTable : undefined,
    slots: def.slots.map(
      (s, i): PopulatedSlot => ({
        id: `preview-${patternId}-${i}`,
        slotRole: s.role,
        order: i,
        article: null,
        mediaUrl: null,
        mediaType: null,
        mediaAlt: null,
        mediaCredit: null,
        scale: "M",
        imageScale: "M",
        previewLength: 200,
        featured: false,
        showByline: true,
        imageFloat: "full",
        imageWidth: 100,
        imageCrop: "original",
        imageCropCustom: null,
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
  fullBlocks,
  roundTable,
  availableArticles,
  staffMembers,
  placeholderOpacity = 0.6,
}: LayoutBuilderProps) {
  const [pickingColumn, setPickingColumn] = useState<"main" | "sidebar" | "full" | null>(null);
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
        // Block in-pattern Link clicks from navigating away while editing
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a")) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col lg:flex-row">
          {/* Main column */}
          <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
            {pickingColumn === "sidebar" ? (
              <PatternList
                column="sidebar"
                onHover={setPreviewId}
                onSelect={handleSelect}
                onCancel={handleCancel}
                roundTable={roundTable}
              />
            ) : (
              <ColumnView
                groupId={groupId}
                column="main"
                blocks={mainBlocks}
                roundTable={roundTable}
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
                roundTable={roundTable}
              />
            ) : (
              <ColumnView
                groupId={groupId}
                column="sidebar"
                blocks={sidebarBlocks}
                roundTable={roundTable}
                onStartPick={() => setPickingColumn("sidebar")}
                isPicking={pickingColumn === "sidebar"}
                previewId={pickingColumn === "sidebar" ? previewId : null}
              />
            )}
          </div>
        </div>

        {/* Full Row section — spans the entire width below main + sidebar */}
        <div className="mt-12 border-t-2 border-neutral-200 pt-8">
          <p className="font-headline text-[12px] font-semibold tracking-[0.12em] uppercase text-caption mb-4">
            Full Row
          </p>
          {pickingColumn === "full" ? (
            <PatternList
              column="full"
              onHover={setPreviewId}
              onSelect={handleSelect}
              onCancel={handleCancel}
              roundTable={roundTable}
            />
          ) : (
            <ColumnView
              groupId={groupId}
              column="full"
              blocks={fullBlocks}
              roundTable={roundTable}
              onStartPick={() => setPickingColumn("full")}
              isPicking={false}
              previewId={null}
            />
          )}
          {pickingColumn === "full" && previewId && (() => {
            const previewBlock = placeholderBlockData(previewId, roundTable);
            if (!previewBlock) return null;
            return (
              <div className="mt-4 border-2 border-dashed border-maroon/30 bg-maroon/5 p-4 min-h-[300px]">
                <p className="font-headline text-[10px] tracking-[0.08em] uppercase text-maroon/60 mb-2">
                  Preview: {PATTERNS[previewId]?.name}
                </p>
                <div className="pointer-events-none">
                  <PatternRenderer block={previewBlock} editMode />
                </div>
              </div>
            );
          })()}
          {pickingColumn === "full" && !previewId && (
            <div className="mt-4 border-2 border-dashed border-neutral-200 p-6 flex items-center justify-center min-h-[300px]">
              <p className="font-headline text-[12px] text-neutral-400">
                Hover a pattern to preview it here
              </p>
            </div>
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
  roundTable,
  onStartPick,
  isPicking,
  previewId,
}: {
  groupId: string;
  column: "main" | "sidebar" | "full";
  blocks: BlockWithSlots[];
  roundTable: RoundTableSummary | null;
  onStartPick: () => void;
  isPicking: boolean;
  previewId: string | null;
}) {
  const columnLabel = column === "sidebar" ? "sidebar" : column === "full" ? "full row" : "main";

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
              Add a {columnLabel} block
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
            roundTable={roundTable}
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

      {isPicking && previewId && column !== "full" && (() => {
        const previewBlock = placeholderBlockData(previewId, roundTable);
        if (!previewBlock) return null;
        return (
          <div
            className={`mt-4 border-2 border-dashed border-maroon/30 bg-maroon/5 p-4 ${
              column === "sidebar" ? "min-h-[250px]" : "min-h-[500px]"
            }`}
          >
            <p className="font-headline text-[10px] tracking-[0.08em] uppercase text-maroon/60 mb-2">
              Preview: {PATTERNS[previewId]?.name}
            </p>
            <div className="pointer-events-none">
              <PatternRenderer block={previewBlock} editMode />
            </div>
          </div>
        );
      })()}

      {isPicking && !previewId && column !== "full" && (
        <div
          className={`mt-4 border-2 border-dashed border-neutral-200 p-6 flex items-center justify-center ${
            column === "sidebar" ? "min-h-[250px]" : "min-h-[500px]"
          }`}
        >
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
  roundTable: _roundTable,
}: {
  column: "main" | "sidebar" | "full";
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onCancel: () => void;
  roundTable: RoundTableSummary | null;
}) {
  const patterns =
    column === "main"
      ? getMainPatterns()
      : column === "sidebar"
      ? getSidebarPatterns()
      : getFullPatterns();

  const label =
    column === "main" ? "main" : column === "sidebar" ? "sidebar" : "full row";

  return (
    <div className="sticky top-12 z-30 bg-white pt-3 pb-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="font-headline text-[14px] font-semibold tracking-wide">
          Choose a {label} pattern
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
            // Only set on enter, never clear on leave: clearing causes the
            // preview to collapse mid-move, the page reflows, and the next
            // button's mouseenter misfires because the cursor lands somewhere
            // different. handleSelect / handleCancel still reset previewId.
            onMouseEnter={() => onHover(p.id)}
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
  roundTable,
}: {
  block: BlockWithSlots;
  groupId: string;
  column: "main" | "sidebar" | "full";
  allBlocks: BlockWithSlots[];
  index: number;
  roundTable: RoundTableSummary | null;
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

      <PatternRenderer block={toBlockData(block, roundTable)} editMode />
    </div>
  );
}
