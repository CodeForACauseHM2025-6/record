import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LayoutBuilder } from "@/app/dashboard/layout-builder";
import { Footer } from "@/app/footer";

const DASHBOARD_ROLES = ["WRITER", "DESIGNER", "EDITOR", "WEB_TEAM", "WEB_MASTER"];

const NAV_SECTIONS = [
  { label: "News", href: "#" },
  { label: "Features", href: "#" },
  { label: "Opinions", href: "#" },
  { label: "A&E", href: "#" },
  { label: "Lion\u2019s Den", href: "#" },
];

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function LayoutEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !DASHBOARD_ROLES.includes(session.user.role ?? "")) redirect("/dashboard");

  const { id } = await params;

  const [group, volSetting] = await Promise.all([
    prisma.articleGroup.findUnique({
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
    }),
    prisma.siteSetting.findUnique({ where: { key: "volumeNumber" } }),
  ]);

  if (!group) notFound();

  const volumeNumber = (volSetting as { value?: string } | null)?.value ?? "";
  const issueNumber = (group as any).issueNumber ?? null;
  const groupDate = group.publishedAt ?? group.createdAt;

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
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      {/* ============ FLOATING EDITOR TOOLBAR ============ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-ink text-white px-4 py-2">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/groups/${id}`}
              className="font-headline text-[13px] tracking-wide text-white/70 hover:text-white transition-colors"
            >
              &larr; Back to Group
            </Link>
            <span className="font-headline text-[13px] tracking-wide text-white/50">|</span>
            <span className="font-headline text-[14px] font-semibold tracking-wide">
              Editing: {group.name}
            </span>
          </div>
          <Link
            href="/"
            target="_blank"
            className="font-headline text-[13px] tracking-wide text-white/70 hover:text-white transition-colors"
          >
            Preview Live &rarr;
          </Link>
        </div>
      </div>

      {/* Spacer for fixed toolbar */}
      <div className="h-[40px]" />

      {/* ============ HEADER (mirrors homepage) ============ */}
      <header className="px-4 sm:px-8 pt-4 pb-2">
        <div className="max-w-[1200px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-4 sm:gap-5 font-headline text-base">
            {/* Hamburger placeholder */}
            <div className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="font-masthead text-[44px] sm:text-[60px] lg:text-[72px] leading-none tracking-tight">
              The Record
            </h1>
            <p className="font-body text-[11px] sm:text-[13px] tracking-[0.08em] mt-0.5">
              Horace Mann&rsquo;s Weekly Newspaper Since 1903
            </p>
          </div>
          <div className="flex items-center justify-end gap-4 sm:gap-5 font-headline text-base">
            <span className="hidden sm:inline font-bold tracking-wide text-caption/30">About</span>
            <div className="w-8 h-8 rounded-full bg-neutral-200" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-caption/30">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </header>

      {/* ============ DATE BAR ============ */}
      <div className="border-t border-rule">
        <p className="text-center font-headline text-[12px] sm:text-[13px] font-semibold tracking-[0.05em] py-1.5">
          {volumeNumber && <>Vol. {volumeNumber}</>}
          {volumeNumber && issueNumber && <> &middot; </>}
          {issueNumber && <>No. {issueNumber}</>}
          {(volumeNumber || issueNumber) && <> &middot; </>}
          {formatDateLong(groupDate)}
        </p>
      </div>

      {/* ============ SECTION NAV ============ */}
      <nav className="border-t border-b border-rule overflow-x-auto">
        <div className="max-w-[1200px] mx-auto flex justify-between gap-6 px-4 sm:px-16 py-3 min-w-max sm:min-w-0">
          {NAV_SECTIONS.map((s) => (
            <span key={s.label} className="font-headline text-lg sm:text-xl tracking-wide whitespace-nowrap text-caption/40 cursor-default">
              {s.label}
            </span>
          ))}
        </div>
      </nav>

      {/* ============ LAYOUT BUILDER (replaces content area) ============ */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-16 flex-1">
        <LayoutBuilder
          groupId={id}
          mainBlocks={mainBlocks as any}
          sidebarBlocks={sidebarBlocks as any}
          availableArticles={availableArticles as { id: string; title: string; section: string }[]}
        />
      </main>

      <Footer />
    </div>
  );
}
