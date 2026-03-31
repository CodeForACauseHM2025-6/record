import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
  formatDateShort,
} from "@/lib/article-helpers";

export function HeroPattern({ slots }: { slots: PopulatedSlot[] }) {
  const featuredSlot = slots[0] ?? null;
  const imageSlot = slots[1] ?? null;
  const headlineSlots = slots.slice(2, 4);

  const article = featuredSlot?.article;
  const heroImage = imageSlot?.mediaUrl ?? null;

  if (!article) return null;

  const author = getAuthorInfo(article);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left — featured article */}
      <div className={heroImage ? "lg:w-[40%]" : "w-full"}>
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic text-[14px]"
        >
          {getSectionLabel(article.section)}
        </Link>
        <h3 className="font-headline text-[24px] sm:text-[28px] font-bold leading-snug mt-1">
          <Link
            href={`/article/${article.slug}`}
            className="hover:text-maroon transition-colors"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 text-[16px] leading-[1.65] text-caption">
          {getPreviewText(article.body, 200)}
        </p>
        <div className="font-headline text-[14px] mt-3">
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

        {/* Headline-only articles below */}
        {headlineSlots.length > 0 && (
          <div className="mt-5 pt-4 border-t border-neutral-200 space-y-3">
            {headlineSlots.map((slot) => {
              if (!slot.article) return null;
              return (
                <div key={slot.id} className="border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0">
                  <h4 className="font-headline text-[18px] font-bold leading-snug">
                    <Link
                      href={`/article/${slot.article.slug}`}
                      className="hover:text-maroon transition-colors"
                    >
                      {slot.article.title}
                    </Link>
                  </h4>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right — hero image */}
      {heroImage && (
        <div className="lg:w-[60%]">
          <img
            src={heroImage}
            alt={imageSlot?.mediaAlt ?? ""}
            className="w-full h-full object-cover"
          />
          {imageSlot?.mediaCredit && (
            <p className="text-right font-headline text-[10px] tracking-wide text-caption/60 mt-1 italic">
              Image by {imageSlot.mediaCredit}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
