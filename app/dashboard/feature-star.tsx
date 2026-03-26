"use client";

import { toggleFeatured } from "@/app/dashboard/article-actions";

export function FeatureStar({ articleId, isFeatured }: { articleId: string; isFeatured: boolean }) {
  return (
    <form action={toggleFeatured.bind(null, articleId)}>
      <button
        type="submit"
        title={isFeatured ? "Remove from featured" : "Feature this article"}
        className={`cursor-pointer text-[20px] transition-colors ${
          isFeatured
            ? "text-amber-500 hover:text-amber-600"
            : "text-neutral-300 hover:text-amber-400"
        }`}
      >
        {isFeatured ? "\u2605" : "\u2606"}
      </button>
    </form>
  );
}
