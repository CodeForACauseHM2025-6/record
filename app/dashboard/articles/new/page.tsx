import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubpageHeader } from "@/app/subpage-header";
import { ArticleForm } from "@/app/dashboard/article-form";
import { createArticle } from "@/app/dashboard/article-actions";

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-white font-body">
      <SubpageHeader pageLabel="New Article" />

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          Create Article
        </h2>
        <p className="font-headline text-[14px] text-caption mt-1 tracking-wide">
          New articles are saved as drafts until published.
        </p>
        <div className="mt-4 h-[2px] bg-rule" />

        <div className="mt-8">
          <ArticleForm action={createArticle} submitLabel="Save Draft" />
        </div>
      </div>
    </div>
  );
}
