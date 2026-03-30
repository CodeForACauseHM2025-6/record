import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubpageHeader } from "@/app/subpage-header";
import { ArticleForm } from "@/app/dashboard/article-form";
import {
  updateArticle,
  publishArticle,
  unpublishArticle,
  deleteArticle,
} from "@/app/dashboard/article-actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-800",
  PUBLISHED: "bg-green-50 text-green-800",
  ARCHIVED: "bg-neutral-100 text-neutral-500",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const isWebMaster = session.user.role === "WEB_MASTER";

  const [article, allUsers] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        credits: { include: { user: { select: { id: true, name: true, role: true, displayTitle: true } } } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true, displayTitle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!article) notFound();

  const existingCredits = article.credits.map((c: (typeof article.credits)[number]) => ({
    userId: c.user.id,
    userName: c.user.name,
    creditRole: c.creditRole,
  }));

  const hasAuthors = article.credits.length > 0;

  const boundUpdate = updateArticle.bind(null, id);
  const boundPublish = publishArticle.bind(null, id);
  const boundUnpublish = unpublishArticle.bind(null, id);
  const boundDelete = deleteArticle.bind(null, id);

  // Build user list with default display titles for the form
  const usersWithDefaults = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    defaultRole: (u as { displayTitle?: string | null }).displayTitle ?? defaultRoleDisplay(u.role),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Edit Article" />

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide leading-tight">
              Edit Article
            </h2>
            <p className="font-headline text-[13px] text-caption mt-1 tracking-wide">
              By {article.createdBy.name} &middot; Last updated {formatDate(article.updatedAt)}
            </p>
          </div>
          <span
            className={`shrink-0 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 mt-2 ${
              STATUS_STYLES[article.status]
            }`}
          >
            {article.status}
          </span>
        </div>
        <div className="mt-4 h-[2px] bg-rule" />

        {/* Action bar — publish/delete only for WEB_MASTER */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isWebMaster && article.status === "DRAFT" && (
            hasAuthors ? (
              <form action={boundPublish}>
                <button
                  type="submit"
                  className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-green-800 text-white px-5 py-2 hover:bg-green-900 transition-colors"
                >
                  Publish
                </button>
              </form>
            ) : (
              <span className="font-headline text-[13px] text-caption/50 italic">
                Add at least one author to publish
              </span>
            )
          )}
          {article.status === "PUBLISHED" && (
            <Link
              href={`/article/${article.slug}`}
              className="font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 hover:border-maroon hover:text-maroon transition-colors"
            >
              View Live
            </Link>
          )}
          {isWebMaster && article.status === "PUBLISHED" && (
            <form action={boundUnpublish}>
              <button
                type="submit"
                className="cursor-pointer font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 text-caption hover:border-maroon hover:text-maroon transition-colors"
              >
                Unpublish
              </button>
            </form>
          )}
          {isWebMaster && (
            <form action={boundDelete} className="ml-auto">
              <button
                type="submit"
                className="cursor-pointer font-headline text-[13px] tracking-wide text-caption/50 hover:text-maroon transition-colors"
              >
                Delete
              </button>
            </form>
          )}
        </div>

        {/* Form */}
        <div className="mt-8">
          <ArticleForm
            action={boundUpdate}
            defaultValues={{
              title: article.title,
              body: article.body,
              section: article.section,
              featuredImage: article.featuredImage,
            }}
            defaultCredits={existingCredits}
            availableUsers={usersWithDefaults}
            submitLabel="Save Changes"
          />
        </div>

      </div>
    </div>
  );
}

function defaultRoleDisplay(role: string): string {
  const map: Record<string, string> = {
    READER: "Reader",
    WRITER: "Staff Writer",
    DESIGNER: "Designer",
    EDITOR: "Editor",
    WEB_TEAM: "Web Team",
    WEB_MASTER: "Web Master",
  };
  return map[role] ?? role;
}
