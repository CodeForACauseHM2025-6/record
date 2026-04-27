import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { createRoundTable } from "@/app/dashboard/roundtable-actions";

export default async function NewRoundTableForGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];
  if (!DASHBOARD_ROLES.includes(session.user.role ?? "")) redirect("/");

  const { id } = await params;

  const group = await prisma.articleGroup.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!group) notFound();

  const boundCreate = createRoundTable.bind(null, id);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="New Round Table" />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 pt-8 pb-16 w-full">
        <Link
          href={`/dashboard/groups/${id}`}
          className="font-headline text-[13px] tracking-wide text-caption hover:text-maroon transition-colors"
        >
          &larr; {group.name}
        </Link>
        <h2 className="mt-3 font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          New Round Table
        </h2>
        <p className="mt-1 font-headline text-[13px] text-caption">
          For group: {group.name}
        </p>
        <div className="mt-3 h-[2px] bg-rule" />

        <form action={boundCreate} className="mt-8 space-y-6">
          <div>
            <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
              Prompt
            </label>
            <textarea
              name="prompt"
              required
              rows={3}
              maxLength={500}
              placeholder="What should this week's round table debate?"
              className="w-full border border-ink/20 px-4 py-3 font-headline text-[18px] leading-snug placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-y"
            />
            <p className="mt-2 font-headline text-[12px] text-caption/70">
              You&rsquo;ll add sides, authors, and arguments on the next screen.
            </p>
          </div>

          <button
            type="submit"
            className="cursor-pointer font-headline font-bold text-[15px] tracking-[0.04em] bg-ink text-white px-8 py-3 hover:bg-maroon transition-colors"
          >
            Create &amp; continue
          </button>
        </form>
      </div>
    </div>
  );
}
