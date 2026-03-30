import { Fragment } from "react";
import Link from "next/link";
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
} from "@/app/dashboard/group-actions";
import { SlotAssigner } from "@/app/dashboard/slot-assigner";
import { DraggableRowList } from "@/app/dashboard/row-list";
import { RowEditor } from "@/app/dashboard/row-editor";
import { SavedToast } from "@/app/dashboard/saved-toast";
import { ApprovalDisplay } from "@/app/dashboard/approval-display";
import { ArticlePool } from "@/app/dashboard/article-pool";

const SIZE_LABELS: Record<string, string> = {
  large: "Large (full width)",
  medium: "Medium (2/3)",
  small: "Small (1/3)",
};

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
};

export default async function GroupEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
  if (!session?.user || !DASHBOARD_ROLES.includes(session.user.role ?? "")) redirect("/dashboard");

  const { id } = await params;
  const { saved } = await searchParams;

  const [group, allArticles] = await Promise.all([
    prisma.articleGroup.findUnique({
      where: { id },
      include: {
        articles: {
          select: { id: true, title: true, section: true },
          orderBy: { publishedAt: "desc" },
        },
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
        approvals: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" as const },
        },
      },
    }),
    prisma.article.findMany({
      select: { id: true, title: true, section: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!group) notFound();

  const approvers = (group.approvals ?? []).map((a: any) => ({
    id: a.user.id,
    approvalId: a.id,
    name: a.user.name,
    image: a.user.image,
  }));
  const hasApproved = approvers.some((a: any) => a.id === session.user.id);
  const isWebMaster = session.user.role === "WEB_MASTER";
  const canPublish = ["EDITOR", "WEB_TEAM", "WEB_MASTER"].includes(session.user.role ?? "");

  // Articles already assigned to a slot in this group
  const assignedIds = new Set(
    group.rows.flatMap((r: (typeof group.rows)[number]) =>
      r.slots.filter((s: (typeof r.slots)[number]) => s.articleId).map((s: (typeof r.slots)[number]) => s.articleId)
    )
  );
  // Pool articles not yet assigned to a slot
  const availableForSlots = group.articles.filter(
    (a: (typeof group.articles)[number]) => !assignedIds.has(a.id)
  );

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
              &middot; {group.articles.length} articles
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

        {/* Approval */}
        <div className="mt-4">
          <ApprovalDisplay
            approvers={approvers}
            currentUserId={session.user.id}
            hasApproved={hasApproved}
            onApprove={async () => { "use server"; const { approveGroup } = await import("@/app/dashboard/group-actions"); await approveGroup(id); }}
            onRemoveApproval={async (approvalId: string) => { "use server"; const { removeGroupApproval } = await import("@/app/dashboard/group-actions"); await removeGroupApproval(approvalId, id); }}
            isWebMaster={isWebMaster}
          />
        </div>

        {/* Name + Issue # (WM only) */}
        {isWebMaster && (
          <form action={boundUpdate} className="mt-4 flex gap-3">
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
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canPublish && group.status === "DRAFT" && (
            <form action={boundPublish}>
              <button type="submit" className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-green-800 text-white px-5 py-2 hover:bg-green-900 transition-colors">
                Publish Now
              </button>
            </form>
          )}
          {canPublish && group.status === "PUBLISHED" && (
            <form action={boundUnpublish}>
              <button type="submit" className="cursor-pointer font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 text-caption hover:border-maroon hover:text-maroon transition-colors">
                Unpublish
              </button>
            </form>
          )}
          {canPublish && group.status === "DRAFT" && (
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
          {isWebMaster && (
            <form action={boundDelete} className="ml-auto">
              <button type="submit" className="cursor-pointer font-headline text-[13px] tracking-wide text-caption/50 hover:text-maroon transition-colors">
                Delete Group
              </button>
            </form>
          )}
        </div>
        <div className="mt-4 h-[2px] bg-rule" />

        {/* Articles */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-[20px] font-bold tracking-wide">Articles</h3>
            <Link
              href={`/dashboard/groups/${id}/articles/new`}
              className="font-headline font-bold text-[13px] tracking-wide bg-ink text-white px-4 py-2 hover:bg-maroon transition-colors"
            >
              Create Article
            </Link>
          </div>

          {/* Article pool */}
          {group.articles.length > 0 ? (
            <div className="space-y-1.5 mb-4">
              {group.articles.map((a: (typeof group.articles)[number]) => (
                <div key={a.id} className="flex items-center justify-between gap-2 border border-ink/10 px-3 py-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <Link
                      href={`/dashboard/articles/${a.id}/edit`}
                      className="font-headline text-[14px] font-semibold truncate hover:text-maroon transition-colors"
                    >
                      {a.title}
                    </Link>
                    <span className="font-headline text-[11px] text-caption/50 shrink-0">
                      {SECTION_LABELS[a.section] ?? a.section}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/articles/${a.id}/edit`}
                    className="font-headline text-[12px] text-maroon hover:underline shrink-0"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-headline text-[14px] text-caption/50 italic mb-4">
              No articles yet. Create one or add existing articles below.
            </p>
          )}

          {/* Add existing articles to pool */}
          <ArticlePool
            groupId={id}
            poolArticles={group.articles as { id: string; title: string; section: string }[]}
            allPublished={allArticles as { id: string; title: string; section: string }[]}
          />
        </div>
        <div className="mt-6 h-[2px] bg-rule" />

        {/* Layout */}
        <div className="mt-8">
          <h3 className="font-headline text-[20px] font-bold tracking-wide mb-4">Layout</h3>

          {group.rows.length === 0 && (
            <p className="font-headline text-[15px] text-caption/50 italic mb-6">
              No rows yet. Add one below.
            </p>
          )}

          <DraggableRowList groupId={id} rowIds={group.rows.map((r: (typeof group.rows)[number]) => r.id)}>
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
                        const DR = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
                        if (!s?.user?.role || !DR.includes(s.user.role)) return;
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
                          availableArticles={availableForSlots as { id: string; title: string; section: string }[]}
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
                    const DR = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
                    if (!s?.user?.role || !DR.includes(s.user.role)) return;
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
