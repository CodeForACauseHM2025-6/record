import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { SavedToast } from "@/app/dashboard/saved-toast";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { saved } = await searchParams;

  const groups = await prisma.articleGroup.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      blocks: {
        include: { slots: { select: { articleId: true } } },
      },
    },
  });

  const canManage = ["EDITOR", "WEB_TEAM", "WEB_MASTER"].includes(session.user.role ?? "");

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Dashboard" />
      {saved && <SavedToast />}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8 pb-16">

        {/* ============ GROUPS SECTION ============ */}
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
            Groups
          </h2>
          {canManage && (
            <Link
              href="/dashboard/groups/new"
              className="font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-5 py-2.5 hover:bg-maroon transition-colors"
            >
              New Group
            </Link>
          )}
        </div>
        <div className="mt-3 h-[2px] bg-rule" />

        {groups.length > 0 ? (
          <div className="mt-4 divide-y divide-neutral-200">
            {groups.map((group) => {
              const slotCount = group.blocks.reduce((sum, b) => sum + b.slots.length, 0);
              const filledCount = group.blocks.reduce(
                (sum, b) => sum + b.slots.filter((s) => s.articleId).length, 0
              );
              return (
                <Link
                  key={group.id}
                  href={`/dashboard/groups/${group.id}`}
                  className="block py-4 hover:bg-neutral-50/50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-headline text-[17px] font-bold">{group.name}</h3>
                      <p className="font-headline text-[13px] text-caption mt-0.5">
                        {group.blocks.length} blocks &middot; {filledCount}/{slotCount} slots filled
                        {group.scheduledAt && (
                          <span> &middot; Scheduled: {formatDate(group.scheduledAt)}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase px-3 py-1 ${
                        group.status === "PUBLISHED"
                          ? "bg-green-50 text-green-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {STATUS_LABELS[group.status]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 font-headline text-[15px] text-caption/50 italic">
            No groups yet. Create one to build your homepage layout.
          </p>
        )}

        {/* ============ ROUND TABLES SECTION ============ */}
        <div className="mt-16 flex items-baseline justify-between gap-4">
          <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
            Round Tables
          </h2>
          <Link
            href="/dashboard/roundtables"
            className="font-headline text-[13px] tracking-wide text-maroon hover:underline"
          >
            Manage &rarr;
          </Link>
        </div>
        <div className="mt-3 h-[2px] bg-rule" />
        <p className="mt-4 font-headline text-[14px] text-caption">
          Weekly back-and-forth debates between staff. Build, publish, and archive round tables.
        </p>

      </div>
    </div>
  );
}
