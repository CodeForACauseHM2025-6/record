# Two-Column Pattern-Based Layout System

## Overview

Replace the current row/slot layout system with a two-column, pattern-based layout inspired by newspaper front pages (NYT, WaPo). The homepage has a main column (2/3 width) and a sidebar column (1/3 width), separated by a vertical rule. Each column contains an ordered stack of "blocks," where each block is a predefined layout pattern (e.g., hero with image, four-article grid, headline stack). Columns are independent — dividers in one column don't cross into the other.

## Data Model

### Remove

- `GroupRow` model (and all rows/slots logic)
- `GroupSlot` model
- All `lockToRow`, `rowSpan`, `autoplay` fields
- The `BleedSection` rendering logic

### Add

```prisma
model LayoutBlock {
  id           String  @id @default(uuid())
  groupId      String
  column       String  // "main" | "sidebar"
  pattern      String  // pattern ID (see Pattern Catalog)
  order        Int
  dividerStyle String  @default("light") // "light" | "bold" | "none"

  group  ArticleGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  slots  BlockSlot[]
}

model BlockSlot {
  id          String  @id @default(uuid())
  blockId     String
  slotRole    String  // "article" | "headline" | "image" | "media"
  order       Int
  articleId   String?
  mediaUrl    String?
  mediaType   String?
  mediaAlt    String?
  mediaCredit String?

  block   LayoutBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
  article Article?    @relation(fields: [articleId], references: [id])
}
```

Update `ArticleGroup` to replace `rows GroupRow[]` with `blocks LayoutBlock[]`.

Update `Article` to replace `groupSlots GroupSlot[]` with `blockSlots BlockSlot[]`.

### `slotRole` values

- `article` — full article display (headline + excerpt + byline + optional featured image)
- `headline` — headline-only display (just the title, clickable)
- `image` — standalone image/media slot (not tied to an article)
- `media` — video/gif slot

## Pattern Catalog

### Main Column Patterns

| ID | Name | Slots Created | Layout |
|---|---|---|---|
| `hero` | Hero + Headlines | 1 article, 1 image, 2 headlines | Featured article left with excerpt + byline. Large image right. 2 headline-only articles stacked below the article text. |
| `four-grid` | Four Articles Grid | 4 articles | 2x2 grid. Top row: text-only (headline + short excerpt). Bottom row: thumbnail left + headline right. |
| `text-images` | Article + Two Images | 1 article, 2 images | Article text (headline + excerpt + byline) on left ~40%. Two tall images side-by-side on right ~60%. |
| `headline-stack` | Headline Stack | 3 headlines | Bold headlines separated by 2px black rules. Text-only, no images. |
| `two-thumbnails` | Two with Images | 2 articles | Side-by-side. Each has image on top, headline + excerpt below. |
| `single-feature` | Single Feature | 1 article | Full-width image on top, big headline + excerpt + byline below. |

### Sidebar Patterns

| ID | Name | Slots Created | Layout |
|---|---|---|---|
| `sb-feature` | Sidebar Feature | 1 article | Image on top, headline + excerpt + byline below. |
| `sb-two-small` | Two Small | 2 articles | Side-by-side. Image + headline each. No excerpt. |
| `sb-headlines` | Headline List | 3 headlines | Text-only stacked headlines with light dividers. |
| `sb-thumbnails` | Thumbnail List | 3 articles | Small square thumbnail left, headline right, stacked vertically. |

### Slot Creation Rules

When a block is created with a given pattern, the system auto-creates the correct number of `BlockSlot` records with the appropriate `slotRole` and `order`. For example, creating a `hero` block creates:
- Slot 0: `slotRole: "article"` (featured story)
- Slot 1: `slotRole: "image"` (hero image)
- Slot 2: `slotRole: "headline"` (sub-headline 1)
- Slot 3: `slotRole: "headline"` (sub-headline 2)

## Dividers

- **Light** (default): 1px `#e5e5e5` line between blocks
- **Bold**: 2px `#111` line between blocks
- **None**: no divider (blocks flow together)

The `dividerStyle` on a block controls the divider that appears **above** that block. The first block in each column has no divider above it regardless of setting.

Dividers are per-column — a bold divider in the main column does not extend into the sidebar.

## Homepage Rendering

### Desktop (lg+)

```
+------------------------------------------+------------------+
|                                          |                  |
|         Main Column (2/3)                |  Sidebar (1/3)   |
|                                          |                  |
|  [Block 1: hero pattern]                 |  [Block 1: sb-   |
|  ─── light divider ───                   |   feature]       |
|  [Block 2: four-grid]                    |  ─── bold ───    |
|  ═══ bold divider ═══                    |  [Block 2: sb-   |
|  [Block 3: headline-stack]               |   headlines]     |
|                                          |                  |
+------------------------------------------+------------------+
```

- Main column: `flex: 2`, `border-right: 1px solid #e5e5e5`, `padding-right: 2rem`
- Sidebar: `flex: 1`, `padding-left: 2rem`
- Vertical rule between columns via the border

### Mobile

- Columns stack vertically: main column on top, sidebar below
- Sidebar gets a top border to separate it from main
- Each block pattern adapts responsively (images stack, grids become single-column)

## Editor (Dashboard)

### Group Page Layout

The group editor at `/dashboard/groups/[id]` changes to:

```
+------------------------------------------+
| Group Name          [Status] [Settings]  |
| [Approval Display]                       |
| [Create Article]                         |
| ─────────────────────────────────────── |
| Articles: [list with edit links]         |
| ─────────────────────────────────────── |
|                                          |
| MAIN COLUMN          │  SIDEBAR          |
| ┌──────────────┐     │  ┌──────────┐    |
| │ Hero block   │     │  │ sb-feat  │    |
| │ [slots...]   │     │  │ [slot]   │    |
| └──────────────┘     │  └──────────┘    |
| ┌──────────────┐     │  ┌──────────┐    |
| │ Four grid    │     │  │ sb-head  │    |
| │ [slots...]   │     │  │ [slots]  │    |
| └──────────────┘     │  └──────────┘    |
| [+ Add Block]        │  [+ Add Block]   |
+------------------------------------------+
```

### Add Block Flow

1. Click "+ Add Block" under a column
2. A dropdown/picker shows available patterns for that column (main or sidebar patterns)
3. Each option shows the pattern name and a small wireframe icon
4. Selecting a pattern creates the block with empty slots
5. Block appears at the bottom of the column

### Block Editor

Each block in the editor shows:
- Pattern name and miniature wireframe
- Divider style toggle (light/bold/none)
- Slot list — each slot shows its role and assigned article/media
- Slot assignment works like current slot assigner (search articles in this group)
- Drag handle to reorder blocks within the column
- Delete button to remove block

### Slot Assignment

- Article slots show a search dropdown of articles in this group (not yet assigned to another slot)
- Headline slots also search group articles but only display the title (no excerpt/image)
- Image/media slots show file upload (same as current media assigner)

## Files to Change

### Schema
- `prisma/schema.prisma` — remove `GroupRow`/`GroupSlot`, add `LayoutBlock`/`BlockSlot`

### Server Actions
- `app/dashboard/group-actions.ts` — remove row/slot actions, add block/slot actions:
  - `addBlock(groupId, column, pattern)` — creates block with auto-generated slots
  - `deleteBlock(blockId, groupId)`
  - `reorderBlocks(groupId, column, blockIds[])`
  - `updateDividerStyle(blockId, style, groupId)`
  - `assignArticleToBlockSlot(slotId, articleId, groupId)`
  - `assignMediaToBlockSlot(slotId, mediaUrl, type, alt, credit, groupId)`
  - `clearBlockSlot(slotId, groupId)`

### Pattern Registry
- `lib/patterns.ts` — new file defining pattern metadata:
  - Pattern ID, name, column type, slot definitions (role + order)
  - Used by both editor (to create blocks) and renderer (to know how to display)

### Homepage
- `app/page.tsx` — replace row-based rendering with two-column block rendering
  - New components: `MainColumn`, `SidebarColumn`
  - One React component per pattern: `HeroPattern`, `FourGridPattern`, `HeadlineStackPattern`, etc.

### Editor
- `app/dashboard/groups/[id]/page.tsx` — replace row editor with two-column block editor
  - New components: `BlockPicker` (pattern selector dropdown), `BlockEditor` (single block with slots)
  - Remove: `RowEditor`, `DraggableRowList`, row-related imports

### Remove
- `app/dashboard/row-editor.tsx`
- `app/dashboard/row-list.tsx`
- `app/dashboard/slot-assigner.tsx` (replace with block-aware slot assigner)

## Migration Path

1. Create new schema models (`LayoutBlock`, `BlockSlot`)
2. Remove old models (`GroupRow`, `GroupSlot`)
3. Run migration (this will delete existing layout data — acceptable since we're rebuilding)
4. Build pattern registry
5. Build homepage renderer (pattern components)
6. Build editor (block picker, block editor, slot assignment)
7. Remove old row/slot code
