import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
} from "@/lib/article-helpers";

export function TwoThumbnailsPattern({ slots }: { slots: PopulatedSlot[] }) {
  const displaySlots = slots.slice(0, 2).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {displaySlots.map((slot) => {
        const article = slot.article!;
        return (
          <div key={slot.id}>
            {article.featuredImage && (
              <Link href={`/article/${article.slug}`} className="block">
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-[150px] object-cover"
                />
              </Link>
            )}
            <h4 className="font-headline text-[20px] font-bold leading-snug mt-2">
              <Link
                href={`/article/${article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {article.title}
              </Link>
            </h4>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-caption">
              {getPreviewText(article.body, 100)}
            </p>
            <Link
              href={getSectionHref(article.section)}
              className="font-headline text-maroon italic text-[13px] mt-1.5 inline-block"
            >
              {getSectionLabel(article.section)}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
