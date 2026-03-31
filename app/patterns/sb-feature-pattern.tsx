import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
  formatDateShort,
} from "@/lib/article-helpers";

export function SbFeaturePattern({ slots }: { slots: PopulatedSlot[] }) {
  const slot = slots[0] ?? null;
  const article = slot?.article;

  if (!article) return null;

  const author = getAuthorInfo(article);

  return (
    <div>
      {article.featuredImage && (
        <Link href={`/article/${article.slug}`} className="block">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full object-cover"
          />
        </Link>
      )}
      <div className="mt-3">
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic text-[13px]"
        >
          {getSectionLabel(article.section)}
        </Link>
        <h4 className="font-headline text-[20px] font-bold leading-snug mt-1">
          <Link
            href={`/article/${article.slug}`}
            className="hover:text-maroon transition-colors"
          >
            {article.title}
          </Link>
        </h4>
        <p className="mt-1.5 text-[15px] leading-[1.6] text-caption">
          {getPreviewText(article.body, 150)}
        </p>
        <div className="font-headline text-[13px] mt-2">
          <Link
            href={`/profile/${author.id}`}
            className="text-maroon font-semibold hover:underline"
          >
            {author.name}
          </Link>{" "}
          <span className="italic">{author.role}</span>
          {article.publishedAt && (
            <span className="text-caption ml-2">
              &middot; {formatDateShort(article.publishedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
