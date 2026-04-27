import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";

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

export default async function RoundTablesListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roundTables = await prisma.roundTable.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      sides: { include: { authors: { include: { user: true } } } },
      turns: { select: { id: true } },
    },
  });

  const canCreate = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"].includes(
    session.user.role ?? ""
  );

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Tables" />
      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8 pb-16 w-full">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
            Round Tables
          </h2>
          {canCreate && (
            <Link
              href="/dashboard/roundtables/new"
              className="font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-5 py-2.5 hover:bg-maroon transition-colors"
            >
              New Round Table
            </Link>
          )}
        </div>
        <div className="mt-3 h-[2px] bg-rule" />

        {roundTables.length > 0 ? (
          <div className="mt-4 divide-y divide-neutral-200">
            {roundTables.map((rt) => {
              const sideSummary = rt.sides
                .map((s) => {
                  const names = s.authors.map((a) => a.user.name).join(", ") || "(no authors)";
                  return `${s.label}: ${names}`;
                })
                .join("  vs  ");
              return (
                <Link
                  key={rt.id}
                  href={`/dashboard/roundtables/${rt.id}/edit`}
                  className="block py-4 hover:bg-neutral-50/50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-headline text-[17px] font-bold leading-snug">
                        {rt.prompt}
                      </h3>
                      <p className="font-headline text-[13px] text-caption mt-1 truncate">
                        {sideSummary} &middot; {rt.turns.length} turns
                        {rt.publishedAt && <> &middot; Published {formatDate(rt.publishedAt)}</>}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase px-3 py-1 ${
                        rt.status === "PUBLISHED"
                          ? "bg-green-50 text-green-800"
                          : rt.status === "ARCHIVED"
                          ? "bg-neutral-100 text-neutral-600"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {STATUS_LABELS[rt.status]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 font-headline text-[15px] text-caption/50 italic">
            No round tables yet.
          </p>
        )}
      </div>
    </div>
  );
}
