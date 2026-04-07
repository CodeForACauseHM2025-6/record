import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccountDropdown } from "@/app/account-dropdown";
import { HamburgerButton } from "@/app/sidebar-menu";
import { Footer } from "@/app/footer";
import { PatternRenderer } from "@/app/patterns/pattern-renderer";
import { BlockData } from "@/app/patterns/types";

const NAV_SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinions", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // Fetch published groups and volume number
  const [groups, volSetting] = await Promise.all([
    prisma.articleGroup.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.siteSetting.findUnique({ where: { key: "volumeNumber" } }),
  ]);
  const volumeNumber = (volSetting as { value?: string } | null)?.value ?? "";

  const totalPages = groups.length;
  const currentGroup = groups[currentPage - 1] ?? null;

  let mainBlocks: BlockData[] = [];
  let sidebarBlocks: BlockData[] = [];
  let groupDate = new Date();

  if (currentGroup) {
    const fullGroup = await prisma.articleGroup.findUnique({
      where: { id: currentGroup.id },
      include: {
        blocks: {
          orderBy: { order: "asc" },
          include: {
            slots: {
              orderBy: { order: "asc" },
              include: {
                article: {
                  include: {
                    createdBy: true,
                    credits: { include: { user: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const allBlocks = (fullGroup?.blocks ?? []) as unknown as (BlockData & { column: string })[];
    mainBlocks = allBlocks.filter((b) => b.column === "main");
    sidebarBlocks = allBlocks.filter((b) => b.column === "sidebar");
    groupDate = currentGroup.publishedAt ?? currentGroup.createdAt;
  }

  const issueNumber = (currentGroup as any)?.issueNumber ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      {/* ============ HEADER ============ */}
      <header className="px-4 sm:px-8 pt-4 pb-2">
        <div className="max-w-[1200px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-4 sm:gap-5 font-headline text-base">
            <HamburgerButton />
          </div>
          <div className="text-center">
            <Link href="/">
              <h1 className="font-masthead text-[44px] sm:text-[60px] lg:text-[72px] leading-none tracking-tight">
                The Record
              </h1>
            </Link>
            <p className="font-body text-[11px] sm:text-[13px] tracking-[0.08em] mt-0.5">
              Horace Mann&rsquo;s Weekly Newspaper Since 1903
            </p>
          </div>
          <div className="flex items-center justify-end gap-4 sm:gap-5 font-headline text-base">
            <Link href="/about" className="hidden sm:inline font-bold tracking-wide">About</Link>
            <div className="hidden md:block">
              <AccountDropdown
                userName={session?.user?.name}
                userEmail={session?.user?.email}
                userImage={session?.user?.image}
                userRole={session?.user?.role ?? "READER"}
              />
            </div>
            <Link href="/search" aria-label="Search" className="p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
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
            <Link key={s.href} href={s.href} className="font-headline text-lg sm:text-xl tracking-wide whitespace-nowrap hover:text-maroon transition-colors">
              {s.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {(mainBlocks.length > 0 || sidebarBlocks.length > 0) ? (
          <div className="flex flex-col lg:flex-row">
            {/* Main Column */}
            <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
              {mainBlocks.map((block, i) => (
                <div key={block.id}>
                  <PatternRenderer block={block} />
                  {i < mainBlocks.length - 1 && block.dividerStyle !== "none" && (
                    <div className={`my-6 ${block.dividerStyle === "bold" ? "h-[2px] bg-ink" : "h-px bg-neutral-200"}`} />
                  )}
                </div>
              ))}
            </div>
            {/* Sidebar */}
            <div className="lg:flex-[1] lg:pl-8 mt-8 lg:mt-0 border-t lg:border-t-0 border-neutral-200 pt-8 lg:pt-0">
              {sidebarBlocks.map((block, i) => (
                <div key={block.id}>
                  <PatternRenderer block={block} />
                  {i < sidebarBlocks.length - 1 && block.dividerStyle !== "none" && (
                    <div className={`my-6 ${block.dividerStyle === "bold" ? "h-[2px] bg-ink" : "h-px bg-neutral-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="font-headline text-2xl text-neutral-400">
              {currentGroup ? "This edition has no content yet." : "No editions published yet."}
            </p>
          </div>
        )}

        {/* ---- PAGINATION ---- */}
        {totalPages >= 1 && (
          <div className="mt-12 flex items-center justify-center gap-3 font-headline text-[22px] tracking-wide">
            {currentPage > 1 && (
              <Link
                href={currentPage === 2 ? "/" : `/?page=${currentPage - 1}`}
                className="h-10 px-3 flex items-center border border-ink/20 hover:border-maroon hover:text-maroon transition-colors text-[15px]"
              >
                &larr; Newer
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (currentPage <= 4) pageNum = i + 1;
              else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = currentPage - 3 + i;
              return (
                <Link
                  key={pageNum}
                  href={pageNum === 1 ? "/" : `/?page=${pageNum}`}
                  className={`w-10 h-10 flex items-center justify-center border transition-colors -indent-[1px] leading-none pb-1 ${
                    pageNum === currentPage
                      ? "border-ink font-bold"
                      : "border-ink/20 hover:border-maroon hover:text-maroon"
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}
            {currentPage < totalPages && (
              <Link
                href={`/?page=${currentPage + 1}`}
                className="h-10 px-3 flex items-center border border-ink/20 hover:border-maroon hover:text-maroon transition-colors text-[15px]"
              >
                Older &rarr;
              </Link>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
