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

  const [article, allUsers] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        credits: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!article) notFound();

  const existingCredits = article.credits.map((c) => ({
    userId: c.user.id,
    userName: c.user.name,
    creditRole: c.creditRole,
  }));

  const boundUpdate = updateArticle.bind(null, id);
  const boundPublish = publishArticle.bind(null, id);
  const boundUnpublish = unpublishArticle.bind(null, id);
  const boundDelete = deleteArticle.bind(null, id);

  return (
    <div className="min-h-screen bg-white font-body">
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

        {/* Action bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {article.status === "DRAFT" && (
            <form action={boundPublish}>
              <button
                type="submit"
                className="font-headline font-bold text-[14px] tracking-wide bg-green-800 text-white px-5 py-2 hover:bg-green-900 transition-colors"
              >
                Publish
              </button>
            </form>
          )}
          {article.status === "PUBLISHED" && (
            <>
              <Link
                href={`/article/${article.slug}`}
                className="font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 hover:border-maroon hover:text-maroon transition-colors"
              >
                View Live
              </Link>
              <form action={boundUnpublish}>
                <button
                  type="submit"
                  className="font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-5 py-2 text-caption hover:border-maroon hover:text-maroon transition-colors"
                >
                  Unpublish
                </button>
              </form>
            </>
          )}
          <form action={boundDelete} className="ml-auto">
            <button
              type="submit"
              className="font-headline text-[13px] tracking-wide text-caption/50 hover:text-maroon transition-colors"
            >
              Delete
            </button>
          </form>
        </div>

        {/* Form */}
        <div className="mt-8">
          <ArticleForm
            action={boundUpdate}
            defaultValues={{
              title: article.title,
              body: article.body,
              excerpt: article.excerpt ?? "",
              section: article.section,
            }}
            defaultCredits={existingCredits}
            availableUsers={allUsers as { id: string; name: string }[]}
            submitLabel="Save Changes"
          />
        </div>
      </div>
    </div>
  );
}
