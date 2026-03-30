import { Fragment } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import {
  updateGroup,
  publishGroup,
  unpublishGroup,
  scheduleGroup,
  deleteGroup,
  addRow,
  deleteRow,
  updateRow,
} from "@/app/dashboard/group-actions";
import { SlotAssigner } from "@/app/dashboard/slot-assigner";
import { DraggableRowList } from "@/app/dashboard/row-list";
import { RowEditor } from "@/app/dashboard/row-editor";
import { SavedToast } from "@/app/dashboard/saved-toast";

const SIZE_LABELS: Record<string, string> = {
  large: "Large (full width)",
  medium: "Medium (2/3)",
  small: "Small (1/3)",
};

export default async function GroupEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "WEB_MASTER") redirect("/dashboard");

  const { id } = await params;
  const { saved } = await searchParams;

  const [group, publishedArticles] = await Promise.all([
    prisma.articleGroup.findUnique({
      where: { id },
      include: {
        rows: {
          orderBy: { order: "asc" },
          include: {
            slots: {
              orderBy: { order: "asc" },
              include: {
                article: {
                  select: { id: true, title: true, section: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, section: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  if (!group) notFound();

  const boundUpdate = updateGroup.bind(null, id);
  const boundPublish = publishGroup.bind(null, id);
  const boundUnpublish = unpublishGroup.bind(null, id);
  const boundSchedule = scheduleGroup.bind(null, id);
  const boundDelete = deleteGroup.bind(null, id);
  const boundAddRow = addRow.bind(null, id);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Edit Group" />
      {saved && <SavedToast />}

      <div className="max-w-[900px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide leading-tight">
              {group.name}
            </h2>
            <p className="font-headline text-[13px] text-caption mt-1">
              {group.rows.length} rows &middot; {group.rows.reduce((sum: number, r: (typeof group.rows)[number]) => sum + r.slots.length, 0)} slots
            </p>
          </div>
          <span
            className={`shrink-0 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 ${
              group.status === "PUBLISHED"
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {group.status}
          </span>
        </div>
        <div className="mt-4 h-[2px] bg-rule" />

        {/* Name + Issue # */}
        <form action={boundUpdate} className="mt-6 flex gap-3">
          <input
            name="name"
            defaultValue={group.name}
            placeholder="Group name..."
            className="flex-1 border border-ink/20 px-4 py-2 font-headline text-[16px] tracking-wide outline-none focus:border-ink transition-colors"
          />
          <input
            name="issueNumber"
            defaultValue={(group as any).issueNumber ?? ""}
            placeholder="Issue #"
            className="w-24 border border-ink/20 px-3 py-2 font-headline text-[16px] tracking-wide outline-none focus:border-ink transition-colors text-center"
          />
          <button type="submit" className="cursor-pointer font-headline font-bold text-[13px] tracking-wide bg-ink text-white px-5 py-2 hover:bg-maroon transition-colors">
            Save
          </button>
        </form>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {group.status === "DRAFT" && (
            <form action={boundPublish}>
              <button type="submit" className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-green-800 text-white px-5 py-2 hover:bg-green-900 transition-colors">
                Publish Now
              </button>
            </form>
          )}
          {group.status === "PUBLISHED" && (
            <form action={boundUnpublish}>
              <button type="submit" className="cursor-pointer font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 text-caption hover:border-maroon hover:text-maroon transition-colors">
                Unpublish
              </button>
            </form>
          )}
          {group.status === "DRAFT" && (
            <form action={boundSchedule} className="flex gap-2 items-center">
              <input
                type="datetime-local"
                name="scheduledAt"
                defaultValue={group.scheduledAt?.toISOString().slice(0, 16) ?? ""}
                className="border border-ink/20 px-3 py-2 font-headline text-[13px] outline-none focus:border-ink transition-colors"
              />
              <button type="submit" className="cursor-pointer font-headline font-bold text-[13px] tracking-wide border border-ink/20 px-4 py-2 hover:border-maroon hover:text-maroon transition-colors">
                Schedule
              </button>
            </form>
          )}
          <form action={boundDelete} className="ml-auto">
            <button type="submit" className="cursor-pointer font-headline text-[13px] tracking-wide text-caption/50 hover:text-maroon transition-colors">
              Delete Group
            </button>
          </form>
        </div>

        {/* Rows */}
        <div className="mt-10">
          <h3 className="font-headline text-[20px] font-bold tracking-wide mb-4">Layout</h3>

          {group.rows.length === 0 && (
            <p className="font-headline text-[15px] text-caption/50 italic mb-6">
              No rows yet. Add one below.
            </p>
          )}

          <DraggableRowList groupId={id} rowIds={group.rows.map((r) => r.id)}>
            {group.rows.map((row, rowIdx) => {
              if (row.isSeparator) {
                const boundDeleteSep = deleteRow.bind(null, row.id, id);
                return (
                  <Fragment key={row.id}>
                    <div className="border border-dashed border-ink/10 px-5 py-2 flex items-center justify-between">
                      <p className="font-headline text-[12px] text-caption/50 tracking-wide">
                        &mdash;&mdash; Separator &mdash;&mdash;
                      </p>
                      <form action={boundDeleteSep}>
                        <button type="submit" className="cursor-pointer font-headline text-[12px] text-caption/40 hover:text-maroon transition-colors">
                          Remove
                        </button>
                      </form>
                    </div>
                    <div className="flex justify-center py-1">
                      <form action={async () => {
                        "use server";
                        const { auth } = await import("@/lib/auth");
                        const s = await auth();
                        if (s?.user?.role !== "WEB_MASTER") return;
                        const { addSeparatorRow } = await import("@/app/dashboard/group-actions");
                        await addSeparatorRow(id, row.order);
                      }}>
                        <button type="submit" className="cursor-pointer font-headline text-[11px] text-caption/60 tracking-wide hover:text-maroon transition-colors">
                          + Separator
                        </button>
                      </form>
                    </div>
                  </Fragment>
                );
              }

              const boundDeleteRow = deleteRow.bind(null, row.id, id);
              const currentLayout = row.slots.map((s: any) => s.size).join(",");
              return (
                <Fragment key={row.id}>
                <div className="border border-ink/10 px-5 py-4">
                  {/* Row header with edit controls */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <p className="font-headline text-[14px] font-semibold tracking-wide">
                        Row {rowIdx + 1}
                      </p>
                      <RowEditor
                        rowId={row.id}
                        groupId={id}
                        currentLayout={currentLayout}
                        isFeatured={row.isFeatured}
                      />
                    </div>
                    <form action={boundDeleteRow}>
                      <button type="submit" className="cursor-pointer font-headline text-[12px] text-caption/40 hover:text-maroon transition-colors">
                        Remove
                      </button>
                    </form>
                  </div>

                  <div className="flex gap-3">
                    {row.slots.map((slot: any) => (
                      <div
                        key={slot.id}
                        className={`border border-dashed border-ink/15 p-3 ${
                          slot.size === "large" ? "flex-[3]" :
                          slot.size === "medium" ? "flex-[2]" : "flex-[1]"
                        }`}
                      >
                        <p className="font-headline text-[11px] tracking-[0.08em] uppercase text-caption/50 mb-2">
                          {SIZE_LABELS[slot.size]}
                        </p>
                        <SlotAssigner
                          slotId={slot.id}
                          groupId={id}
                          currentArticleId={slot.articleId}
                          currentArticleTitle={slot.article?.title ?? null}
                          currentMediaUrl={slot.mediaUrl ?? null}
                          currentMediaType={slot.mediaType ?? null}
                          currentMediaAlt={slot.mediaAlt ?? null}
                          currentMediaCredit={slot.mediaCredit ?? null}
                          currentLockToRow={slot.lockToRow ?? true}
                          currentRowSpan={slot.rowSpan ?? null}
                          currentAutoplay={slot.autoplay ?? true}
                          availableArticles={publishedArticles as { id: string; title: string; section: string }[]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center py-1">
                  <form action={async () => {
                    "use server";
                    const { auth } = await import("@/lib/auth");
                    const s = await auth();
                    if (s?.user?.role !== "WEB_MASTER") return;
                    const { addSeparatorRow } = await import("@/app/dashboard/group-actions");
                    await addSeparatorRow(id, row.order);
                  }}>
                    <button type="submit" className="cursor-pointer font-headline text-[11px] text-caption/60 tracking-wide hover:text-maroon transition-colors">
                      + Separator
                    </button>
                  </form>
                </div>
                </Fragment>
              );
            })}
          </DraggableRowList>

          {/* Add row */}
          <div className="mt-6 border border-ink/10 px-5 py-4">
            <p className="font-headline text-[14px] font-semibold tracking-wide mb-3">
              Add Row
            </p>
            <form action={boundAddRow} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block font-headline text-[12px] text-caption tracking-wide mb-1">Layout</label>
                <select name="layout" className="border border-ink/20 px-3 py-2 font-headline text-[14px] outline-none bg-white">
                  <option value="large">Large (full width)</option>
                  <option value="medium,small">Medium + Small</option>
                  <option value="small,medium">Small + Medium</option>
                  <option value="small,small,small">3 Small</option>
                </select>
              </div>
              <label className="flex items-center gap-2 font-headline text-[13px] tracking-wide">
                <input type="checkbox" name="isFeatured" value="true" />
                Featured row
              </label>
              <button type="submit" className="cursor-pointer font-headline font-bold text-[13px] tracking-wide bg-ink text-white px-5 py-2 hover:bg-maroon transition-colors">
                Add Row
              </button>
            </form>
          </div>
        </div>

        {/* Preview link */}
        <div className="mt-8">
          <a
            href="/"
            target="_blank"
            className="font-headline text-[14px] tracking-wide text-maroon hover:underline"
          >
            Preview homepage &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
