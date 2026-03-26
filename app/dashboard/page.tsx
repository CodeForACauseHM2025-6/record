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

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News",
  FEATURES: "Features",
  OPINIONS: "Opinion",
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

  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  const drafts = articles.filter((a) => a.status === "DRAFT");
  const published = articles.filter((a) => a.status === "PUBLISHED");
  const archived = articles.filter((a) => a.status === "ARCHIVED");

  return (
    <div className="min-h-screen bg-white font-body">
      <SubpageHeader pageLabel="Dashboard" />
      {saved && <SavedToast />}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {/* Header row */}
        <div className="flex items-baseline justify-between">
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
          {articles.length > 0 ? (
            <div className="divide-y divide-neutral-200">
              {articles.map((article) => (
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
