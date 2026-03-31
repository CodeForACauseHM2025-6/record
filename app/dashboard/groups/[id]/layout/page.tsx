import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LayoutBuilder } from "@/app/dashboard/layout-builder";

const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];

export default async function LayoutEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !DASHBOARD_ROLES.includes(session.user.role ?? "")) redirect("/dashboard");

  const { id } = await params;

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
    },
  });

  if (!group) notFound();

  const mainBlocks = group.blocks.filter((b: (typeof group.blocks)[number]) => b.column === "main");
  const sidebarBlocks = group.blocks.filter((b: (typeof group.blocks)[number]) => b.column === "sidebar");

  const assignedIds = new Set(
    group.blocks.flatMap((b: (typeof group.blocks)[number]) =>
      b.slots.filter((s: (typeof b.slots)[number]) => s.articleId).map((s: (typeof b.slots)[number]) => s.articleId)
    )
  );
  const availableArticles = group.articles.filter(
    (a: (typeof group.articles)[number]) => !assignedIds.has(a.id)
  );

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      {/* Minimal header */}
      <div className="border-b border-neutral-200 px-4 sm:px-8 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/groups/${id}`}
              className="font-headline text-[13px] tracking-wide text-caption hover:text-ink transition-colors"
            >
              &larr; Back
            </Link>
            <h1 className="font-headline text-[18px] font-bold tracking-wide">
              {group.name} — Layout
            </h1>
          </div>
          <Link
            href="/"
            target="_blank"
            className="font-headline text-[13px] tracking-wide text-maroon hover:underline"
          >
            Preview &rarr;
          </Link>
        </div>
      </div>

      {/* Layout builder */}
      <div className="flex-1">
        <LayoutBuilder
          groupId={id}
          mainBlocks={mainBlocks as any}
          sidebarBlocks={sidebarBlocks as any}
          availableArticles={availableArticles as { id: string; title: string; section: string }[]}
        />
      </div>
    </div>
  );
}
