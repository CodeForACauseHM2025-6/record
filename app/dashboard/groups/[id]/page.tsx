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
} from "@/app/dashboard/group-actions";
import { SavedToast } from "@/app/dashboard/saved-toast";
import { ApprovalDisplay } from "@/app/dashboard/approval-display";

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

  const group = await prisma.articleGroup.findUnique({
    where: { id },
    include: {
      articles: {
        select: { id: true, title: true, section: true },
        orderBy: { createdAt: "desc" },
      },
      blocks: {
        orderBy: { order: "asc" },
        include: {
          slots: {
            orderBy: { order: "asc" },
            include: {
              article: { select: { id: true, title: true, section: true } },
            },
          },
        },
      },
      approvals: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

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

  // Split blocks by column
  const mainBlocks = group.blocks.filter((b: any) => b.column === "main");
  const sidebarBlocks = group.blocks.filter((b: any) => b.column === "sidebar");

  const totalSlots = group.blocks.reduce((sum: number, b: any) => sum + b.slots.length, 0);

  const boundUpdate = updateGroup.bind(null, id);
  const boundPublish = publishGroup.bind(null, id);
  const boundUnpublish = unpublishGroup.bind(null, id);
  const boundSchedule = scheduleGroup.bind(null, id);
  const boundDelete = deleteGroup.bind(null, id);

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
              {group.blocks.length} blocks &middot; {totalSlots} slots
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

          {group.articles.length > 0 ? (
            <div className="space-y-1.5">
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
            <p className="font-headline text-[14px] text-caption/50 italic">
              No articles yet. Create one above.
            </p>
          )}
        </div>
        <div className="mt-6 h-[2px] bg-rule" />

        {/* Layout */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-[20px] font-bold tracking-wide">Layout</h3>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/groups/${id}/layout`}
                className="font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-5 py-2.5 hover:bg-maroon transition-colors"
              >
                Configure Layout
              </Link>
              <a
                href="/"
                target="_blank"
                className="font-headline text-[13px] tracking-wide text-maroon hover:underline"
              >
                Preview &rarr;
              </a>
            </div>
          </div>
          <p className="font-headline text-[14px] text-caption">
            {group.blocks.length === 0
              ? "No layout configured yet. Click Configure Layout to start building."
              : `${mainBlocks.length} main blocks, ${sidebarBlocks.length} sidebar blocks`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
