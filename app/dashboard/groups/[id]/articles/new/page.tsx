import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { ArticleForm } from "@/app/dashboard/article-form";
import { createArticleInGroup } from "@/app/dashboard/article-actions";
import { formatIssueTitle } from "@/lib/article-helpers";

const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];

export default async function NewArticleInGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !DASHBOARD_ROLES.includes(session.user.role ?? "")) redirect("/dashboard");

  const { id } = await params;

  const [group, rawUsers] = await Promise.all([
    prisma.articleGroup.findUnique({
      where: { id },
      select: { id: true, name: true, volumeNumber: true, issueNumber: true },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true, displayTitle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!group) notFound();

  const ROLE_DISPLAY: Record<string, string> = {
    READER: "Reader",
    WRITER: "Staff Writer",
    DESIGNER: "Designer",
    EDITOR: "Editor",
    WEB_TEAM: "Web Team",
    WEB_MASTER: "Web Master",
  };

  const allUsers = rawUsers.map((u: (typeof rawUsers)[number]) => ({
    id: u.id,
    name: u.name,
    defaultRole: (u as { displayTitle?: string | null }).displayTitle ?? ROLE_DISPLAY[u.role] ?? u.role,
  }));

  const boundCreate = createArticleInGroup.bind(null, id);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="New Article" />

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          New Article
        </h2>
        <p className="font-headline text-[14px] text-caption mt-1 tracking-wide">
          Adding to <span className="font-semibold">{formatIssueTitle(group)}</span>
        </p>
        <div className="mt-4 h-[2px] bg-rule" />

        <div className="mt-8">
          <ArticleForm
            action={boundCreate}
            availableUsers={allUsers}
            submitLabel="Save Article"
          />
        </div>
      </div>
    </div>
  );
}
