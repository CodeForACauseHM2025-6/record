import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccountDropdown } from "@/app/account-dropdown";
import { HamburgerButton } from "@/app/sidebar-menu";
import { VideoPlayer } from "@/app/video-player";
import { Footer } from "@/app/footer";

const NAV_SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinions", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News",
  FEATURES: "Features",
  OPINIONS: "Opinions",
  A_AND_E: "A&E",
  LIONS_DEN: "Lion\u2019s Den",
  THE_ROUNDTABLE: "The Roundtable",
};

const SECTION_HREFS: Record<string, string> = {
  NEWS: "/section/news",
  FEATURES: "/section/features",
  OPINIONS: "/section/opinions",
  A_AND_E: "/section/a-and-e",
  LIONS_DEN: "/section/lions-den",
  THE_ROUNDTABLE: "/section/the-roundtable",
};

interface SlotArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  section: string;
  featuredImage: string | null;
  publishedAt: Date | null;
  createdBy: { id: string; name: string; role: string; displayTitle: string | null };
  credits: { creditRole: string; user: { id: string; name: string } }[];
  images: { url: string; caption: string | null; altText: string }[];
}

interface SlotData {
  id: string;
  size: string;
  order: number;
  article: SlotArticle | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaAlt: string | null;
  mediaCredit: string | null;
  lockToRow: boolean;
  rowSpan: number | null;
  autoplay: boolean;
}

interface RowData {
  id: string;
  order: number;
  isFeatured: boolean;
  isSeparator: boolean;
  slots: SlotData[];
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getPreviewText(body: string, maxLen = 200): string {
  const plain = stripHtml(body);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
}

function getAuthorInfo(article: SlotArticle) {
  if (article.credits.length > 0) {
    const primary = article.credits[0];
    return { name: primary.user.name, role: primary.creditRole, id: primary.user.id };
  }
  const ROLE_DISPLAY: Record<string, string> = {
    READER: "Reader", WRITER: "Staff Writer", DESIGNER: "Designer",
    EDITOR: "Editor", WEB_TEAM: "Web Team", WEB_MASTER: "Web Master",
  };
  return {
    name: article.createdBy.name,
    role: article.createdBy.displayTitle ?? ROLE_DISPLAY[article.createdBy.role] ?? article.createdBy.role,
    id: article.createdBy.id,
  };
}

interface SectionGroup {
  rows: RowData[];
  hasBleed: boolean;
}

function hasUniformColumns(rows: RowData[]): boolean {
  if (rows.length <= 1) return true;
  const first = rows[0].slots.map((s) => s.size).join(",");
  return rows.every((r) => r.slots.map((s) => s.size).join(",") === first);
}

function groupRowsIntoSections(rows: RowData[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let current: RowData[] = [];

  for (const row of rows) {
    if (row.isSeparator) {
      if (current.length > 0) {
        const hasBleed = current.some((r) =>
          r.slots.some((s) => !s.lockToRow)
        );
        sections.push({ rows: current, hasBleed });
      }
      current = [];
    } else {
      current.push(row);
    }
  }

  if (current.length > 0) {
    const hasBleed = current.some((r) =>
      r.slots.some((s) => !s.lockToRow)
    );
    sections.push({ rows: current, hasBleed });
  }

  return sections;
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

  let rows: RowData[] = [];
  let groupDate = new Date();

  if (currentGroup) {
    const fullGroup = await prisma.articleGroup.findUnique({
      where: { id: currentGroup.id },
      include: {
        rows: {
          orderBy: { order: "asc" },
          include: {
            slots: {
              orderBy: { order: "asc" },
              include: {
                article: {
                  include: {
                    createdBy: true,
                    credits: { include: { user: true } },
                    images: { orderBy: { order: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });
    rows = (fullGroup?.rows ?? []) as unknown as RowData[];
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
        {rows.length > 0 ? (
          <div className="space-y-0">
            {groupRowsIntoSections(rows).map((section, sIdx) => (
              <div key={sIdx}>
                {sIdx > 0 && <div className="h-px bg-rule my-2" />}
                {section.hasBleed && section.rows.length > 1 ? (
                  <>
                    <BleedSection rows={section.rows} />
                    {/* Mobile fallback — stacked rows */}
                    <div className="lg:hidden">
                      {section.rows.map((row) => (
                        <div key={row.id} className="border-b border-neutral-200 last:border-b-0">
                          <div className="flex flex-col">
                            {row.slots.filter((s) => s.mediaUrl || s.article).map((slot) => (
                              <div key={slot.id} className="py-7">
                                {slot.mediaUrl ? (
                                  <MediaElement slot={slot} />
                                ) : (
                                  <ArticleCard article={slot.article!} size={slot.size} isFeatured={row.isFeatured} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  section.rows.filter((r) => r.slots.some((s) => s.mediaUrl || s.article)).map((row) => {
                    const filled = row.slots.filter((s) => s.mediaUrl || s.article);
                    return (
                    <div key={row.id} className="border-b border-neutral-200 last:border-b-0">
                      <div className="flex flex-col lg:flex-row lg:items-stretch">
                        {filled.map((slot, slotIdx) => (
                          <div
                            key={slot.id}
                            className={`py-7 flex flex-col ${
                              slot.size === "large" ? "lg:flex-[3]" :
                              slot.size === "medium" ? "lg:flex-[2]" : "lg:flex-[1]"
                            } ${
                              slotIdx < filled.length - 1 ? "lg:pr-8 lg:border-r lg:border-neutral-200" : ""
                            } ${
                              slotIdx > 0 ? "lg:pl-8" : ""
                            }`}
                          >
                            {slot.mediaUrl ? (
                              <MediaElement slot={slot} />
                            ) : (
                              <ArticleCard article={slot.article!} size={slot.size} isFeatured={row.isFeatured} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="font-headline text-2xl text-neutral-400">
              {currentGroup ? "This edition has no articles yet." : "No editions published yet."}
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

function ArticleCard({ article, size, isFeatured = false, rowSpan = 1 }: { article: SlotArticle; size: string; isFeatured?: boolean; rowSpan?: number }) {
  const author = getAuthorInfo(article);
  const isLarge = size === "large";
  const isMedium = size === "medium";
  const spansRows = rowSpan > 1;
  const previewLen = spansRows ? 800 : isLarge ? 220 : isMedium ? 160 : 120;
  const titleSize = spansRows
    ? "text-[24px] sm:text-[28px]"
    : isLarge ? "text-[24px] sm:text-[28px]" : isMedium ? "text-[22px] sm:text-[24px]" : "text-[20px] sm:text-[22px]";

  const imageWidth = spansRows ? "w-full" : isLarge ? "w-[45%]" : isMedium ? "w-[40%]" : "w-[38%]";

  return (
    <div className={spansRows ? "flex flex-col flex-1" : ""}>
      {article.featuredImage && !spansRows && (
        <Link href={`/article/${article.slug}`} className={`float-left mr-4 mb-2 ${imageWidth}`}>
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-auto object-cover"
          />
        </Link>
      )}
      {article.featuredImage && spansRows && (
        <Link href={`/article/${article.slug}`} className="block mb-4">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full max-h-[300px] object-contain"
          />
        </Link>
      )}
      <div className={spansRows ? "flex flex-col flex-1" : ""}>
        <div className="flex items-center gap-2">
          <Link href={SECTION_HREFS[article.section] ?? "#"} className="font-headline text-maroon italic text-[14px]">
            {SECTION_LABELS[article.section] ?? article.section}
          </Link>
          {isFeatured && (
            <span className="font-headline text-[10px] font-semibold tracking-[0.08em] uppercase bg-maroon text-white px-1.5 py-0.5">
              Featured
            </span>
          )}
        </div>
        <h3 className={`font-headline ${titleSize} font-bold leading-snug mt-1`}>
          <Link href={`/article/${article.slug}`} className="hover:text-maroon transition-colors">
            {article.title}
          </Link>
        </h3>
        <p className={`mt-2 text-[16px] leading-[1.65] text-caption ${spansRows ? "flex-1 overflow-hidden" : ""}`}>
          {getPreviewText(article.body, previewLen)}
        </p>
        <div className={`font-headline text-[14px] ${spansRows ? "mt-auto pt-3" : "mt-3"}`}>
          <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
          <span className="italic">{author.role}</span>
          {article.publishedAt && (
            <span className="text-caption ml-2">&middot; {formatDateShort(article.publishedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaElement({ slot }: { slot: SlotData }) {
  if (!slot.mediaUrl) return null;

  let heightStyle: React.CSSProperties | undefined;
  let fit = slot.lockToRow ? "object-contain" : "object-cover";
  if (slot.lockToRow) {
    heightStyle = { maxHeight: "250px" };
  } else {
    heightStyle = { height: "100%", minHeight: "200px" };
  }

  const creditLabel = slot.mediaCredit
    ? `${slot.mediaType === "video" ? "Video" : "Image"} by ${slot.mediaCredit}`
    : null;

  if (slot.mediaType === "video") {
    return (
      <div className="relative">
        <VideoPlayer
          src={slot.mediaUrl}
          autoplay={slot.autoplay}
          className={`w-full ${fit}`}
          style={heightStyle}
        />
        {creditLabel && (
          <p className="absolute bottom-8 right-2 font-headline text-[10px] tracking-wide text-white/70 bg-black/30 px-1.5 py-0.5">
            {creditLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <figure>
      <img
        src={slot.mediaUrl}
        alt={slot.mediaAlt ?? ""}
        className={`w-full ${fit}`}
        style={heightStyle}
      />
      {creditLabel && (
        <figcaption className="text-right font-headline text-[10px] tracking-wide text-caption/60 mt-1 italic">
          {creditLabel}
        </figcaption>
      )}
    </figure>
  );
}

function BleedSection({ rows }: { rows: RowData[] }) {
  const sizeToSpan: Record<string, number> = { large: 3, medium: 2, small: 1 };

  // Build grid items with explicit column positions
  const gridItems: {
    slot: SlotData;
    isFeatured: boolean;
    colStart: number;
    colSpan: number;
    rowSpan: number;
    isLast: boolean;
  }[] = [];

  for (const row of rows) {
    const slots = row.slots;
    let col = 1; // CSS grid columns are 1-indexed
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const colSpan = sizeToSpan[slot.size] ?? 1;
      // Skip empty slots
      if (!slot.mediaUrl && !slot.article) { col += colSpan; continue; }
      let rSpan = 1;
      if (!slot.lockToRow) {
        rSpan = slot.rowSpan ?? 2;
      }
      gridItems.push({
        slot,
        isFeatured: row.isFeatured,
        colStart: col,
        colSpan,
        rowSpan: rSpan,
        isLast: si === slots.length - 1,
      });
      col += colSpan;
    }
  }

  return (
    <div
      className="hidden lg:grid gap-0"
      style={{ gridTemplateColumns: "repeat(3, 1fr)", gridAutoFlow: "dense", gridAutoRows: "min-content" }}
    >
      {gridItems.map(({ slot, isFeatured, colStart, colSpan, rowSpan, isLast }) => (
        <div
          key={slot.id}
          className={`py-7 px-4 border-b border-neutral-200 flex flex-col ${isLast ? "" : "border-r"}`}
          style={{
            gridColumn: `${colStart} / span ${colSpan}`,
            gridRow: `span ${rowSpan}`,
          }}
        >
          {slot.mediaUrl ? (
            <MediaElement slot={slot} />
          ) : slot.article ? (
            <ArticleCard article={slot.article} size={slot.size} isFeatured={isFeatured} rowSpan={rowSpan} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
