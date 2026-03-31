import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
  formatDateShort,
} from "@/lib/article-helpers";

export function TextImagesPattern({ slots }: { slots: PopulatedSlot[] }) {
  const articleSlot = slots[0] ?? null;
  const imageSlots = slots.slice(1, 3);

  const article = articleSlot?.article;
  if (!article) return null;

  const author = getAuthorInfo(article);
  const images = imageSlots.filter((s) => s.mediaUrl);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left — article text */}
      <div className="lg:w-[40%]">
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic text-[14px]"
        >
          {getSectionLabel(article.section)}
        </Link>
        <h3 className="font-headline text-[22px] sm:text-[26px] font-bold leading-snug mt-1">
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
      </div>

      {/* Right — two tall images side by side */}
      {images.length > 0 && (
        <div className="lg:w-[60%] flex gap-3">
          {images.map((slot) => (
            <div key={slot.id} className="flex-1">
              <img
                src={slot.mediaUrl!}
                alt={slot.mediaAlt ?? ""}
                className="w-full h-full object-cover"
              />
              {slot.mediaCredit && (
                <p className="text-right font-headline text-[10px] tracking-wide text-caption/60 mt-1 italic">
                  Image by {slot.mediaCredit}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
