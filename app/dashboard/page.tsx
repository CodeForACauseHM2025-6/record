import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { SavedToast } from "@/app/dashboard/saved-toast";
import { createGroup } from "@/app/dashboard/group-actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News",
  FEATURES: "Features",
  OPINIONS: "Opinions",
  A_AND_E: "A&E",
  LIONS_DEN: "Lion\u2019s Den",
  THE_ROUNDTABLE: "The Roundtable",
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

  const [articles, groups] = await Promise.all([
    prisma.article.findMany({
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.articleGroup.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        rows: {
          include: { slots: { select: { articleId: true } } },
        },
      },
    }),
  ]);

  const sortedArticles = [
    ...articles.filter((a) => a.status === "PUBLISHED"),
    ...articles.filter((a) => a.status === "DRAFT"),
    ...articles.filter((a) => a.status === "ARCHIVED"),
  ];

  const isWebMaster = session.user.role === "WEB_MASTER";
  const drafts = articles.filter((a) => a.status === "DRAFT");
  const published = articles.filter((a) => a.status === "PUBLISHED");
  const archived = articles.filter((a) => a.status === "ARCHIVED");

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Dashboard" />
      {saved && <SavedToast />}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8 pb-16">

        {/* ============ GROUPS SECTION (WEB_MASTER only) ============ */}
        {isWebMaster && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
                Groups
              </h2>
              <form action={createGroup} className="flex gap-2">
                <input
                  name="name"
                  placeholder="New group name..."
                  required
                  className="border border-ink/20 px-3 py-2 font-headline text-[14px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors w-48"
                />
                <button type="submit" className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-4 py-2 hover:bg-maroon transition-colors">
                  Create
                </button>
              </form>
            </div>
            <div className="mt-3 h-[2px] bg-rule" />

            {groups.length > 0 ? (
              <div className="mt-4 divide-y divide-neutral-200">
                {groups.map((group) => {
                  const slotCount = group.rows.reduce((sum, r) => sum + r.slots.length, 0);
                  const filledCount = group.rows.reduce(
                    (sum, r) => sum + r.slots.filter((s) => s.articleId).length, 0
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
                            {group.rows.length} rows &middot; {filledCount}/{slotCount} slots filled
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

            <div className="mt-10" />
          </>
        )}

        {/* ============ ARTICLES SECTION ============ */}
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
            Articles
          </h2>
          <Link
            href="/dashboard/articles/new"
            className="font-headline font-bold text-[15px] tracking-wide bg-ink text-white px-5 py-2.5 hover:bg-maroon transition-colors"
          >
            New Article
          </Link>
        </div>
        <div className="mt-3 h-[2px] bg-rule" />

        {/* Stats row */}
        <div className="mt-6 flex gap-8 font-headline text-[14px] tracking-wide">
          <span>
            <span className="font-bold text-[18px]">{drafts.length}</span>{" "}
            <span className="text-caption">Drafts</span>
          </span>
          <span>
            <span className="font-bold text-[18px]">{published.length}</span>{" "}
            <span className="text-caption">Published</span>
          </span>
          <span>
            <span className="font-bold text-[18px]">{archived.length}</span>{" "}
            <span className="text-caption">Archived</span>
          </span>
        </div>

        {/* Articles table */}
        <div className="mt-8">
          {sortedArticles.length > 0 ? (
            <div className="divide-y divide-neutral-200">
              {sortedArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/dashboard/articles/${article.id}/edit`}
                  className="block py-5 hover:bg-neutral-50/50 transition-colors -mx-4 px-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline text-[18px] font-bold leading-snug truncate">
                        {article.title}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-3 font-headline text-[13px] text-caption">
                        <span className="italic">
                          {SECTION_LABELS[article.section] ?? article.section}
                        </span>
                        <span>&middot;</span>
                        <span>{article.createdBy.name}</span>
                        <span>&middot;</span>
                        <span>{formatDate(article.updatedAt)}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase px-3 py-1 ${
                        article.status === "PUBLISHED"
                          ? "bg-green-50 text-green-800"
                          : article.status === "DRAFT"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {STATUS_LABELS[article.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="font-headline text-[20px] text-caption/50 italic">
                No articles yet.
              </p>
              <Link
                href="/dashboard/articles/new"
                className="inline-block mt-4 font-headline font-bold text-[14px] tracking-wide text-maroon hover:underline"
              >
                Create your first article
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
