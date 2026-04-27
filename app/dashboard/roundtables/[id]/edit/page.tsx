import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { RoundTableForm } from "@/app/dashboard/roundtable-form";
import { SavedToast } from "@/app/dashboard/saved-toast";
import {
  updateRoundTable,
  publishRoundTable,
  unpublishRoundTable,
  archiveRoundTable,
  deleteRoundTable,
} from "@/app/dashboard/roundtable-actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const EDITOR_ROLES = ["EDITOR", "WEB_TEAM", "WEB_MASTER"];

export default async function EditRoundTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { saved } = await searchParams;

  const rt = await prisma.roundTable.findUnique({
    where: { id },
    include: {
      sides: {
        orderBy: { order: "asc" },
        include: { authors: { include: { user: true } } },
      },
      turns: { orderBy: { order: "asc" } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!rt) notFound();

  // Map turn.sideId → side index (0 or 1)
  const sideIndexById: Record<string, number> = {};
  rt.sides.forEach((s, i) => {
    sideIndexById[s.id] = i;
  });

  const initialSides = rt.sides.map((s) => ({
    id: s.id,
    label: s.label,
    authorIds: s.authors.map((a) => a.userId),
  }));

  const initialTurns = rt.turns.map((t) => ({
    sideIndex: sideIndexById[t.sideId] ?? 0,
    body: t.body,
  }));

  const [staff, groups] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "READER" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.articleGroup.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true },
    }),
  ]);

  const canEditorize = EDITOR_ROLES.includes(session.user.role ?? "");

  const updateAction = async (formData: FormData) => {
    "use server";
    await updateRoundTable(id, formData);
  };

  const publishAction = async () => {
    "use server";
    await publishRoundTable(id);
  };

  const unpublishAction = async () => {
    "use server";
    await unpublishRoundTable(id);
  };

  const archiveAction = async () => {
    "use server";
    await archiveRoundTable(id);
  };

  const deleteAction = async () => {
    "use server";
    await deleteRoundTable(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Round Table" />
      {saved && <SavedToast />}

      <div className="max-w-[900px] mx-auto px-4 sm:px-8 pt-8 pb-16 w-full">
        <Link
          href="/dashboard/roundtables"
          className="font-headline text-[13px] tracking-wide text-caption hover:text-maroon transition-colors"
        >
          &larr; Round Tables
        </Link>

        <div className="mt-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
            Edit Round Table
          </h2>
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
        <div className="mt-3 h-[2px] bg-rule" />

        <RoundTableForm
          action={updateAction}
          defaultPrompt={rt.prompt}
          defaultGroupId={rt.groupId}
          initialSides={initialSides}
          initialTurns={initialTurns}
          availableUsers={staff.map((u) => ({ id: u.id, name: u.name }))}
          availableGroups={groups.map((g) => ({
            id: g.id,
            name: g.name,
            status: g.status,
          }))}
        />

        {canEditorize && (
          <div className="mt-12 pt-8 border-t border-rule space-y-3">
            <h3 className="font-headline text-[18px] font-bold tracking-wide">Status</h3>
            <div className="flex flex-wrap gap-3">
              {rt.status !== "PUBLISHED" && (
                <form action={publishAction}>
                  <button
                    type="submit"
                    className="cursor-pointer font-headline text-[14px] font-bold tracking-wide bg-green-700 text-white px-5 py-2 hover:bg-green-800 transition-colors"
                  >
                    Publish
                  </button>
                </form>
              )}
              {rt.status === "PUBLISHED" && (
                <form action={unpublishAction}>
                  <button
                    type="submit"
                    className="cursor-pointer font-headline text-[14px] font-bold tracking-wide bg-amber-700 text-white px-5 py-2 hover:bg-amber-800 transition-colors"
                  >
                    Unpublish
                  </button>
                </form>
              )}
              {rt.status !== "ARCHIVED" && (
                <form action={archiveAction}>
                  <button
                    type="submit"
                    className="cursor-pointer font-headline text-[14px] tracking-wide border border-ink/20 text-ink px-5 py-2 hover:border-ink hover:bg-neutral-50 transition-colors"
                  >
                    Archive
                  </button>
                </form>
              )}
              <form action={deleteAction}>
                <button
                  type="submit"
                  className="cursor-pointer font-headline text-[14px] tracking-wide text-maroon hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
            {rt.status === "PUBLISHED" && (
              <p className="font-headline text-[13px] text-caption">
                <Link
                  href={`/roundtable/${rt.slug}`}
                  className="hover:text-maroon transition-colors"
                >
                  View public page &rarr;
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
