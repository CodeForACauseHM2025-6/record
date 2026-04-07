import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
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
  const fs = featuredSlot.scale;

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — featured article */}
        <div className={heroImage ? "lg:w-[40%]" : "w-full"}>
          {featuredSlot.featured && (
            <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
          )}
          <Link
            href={getSectionHref(article.section)}
            className="font-headline text-maroon italic"
            style={{ fontSize: scalePx(14, fs) }}
          >
            {getSectionLabel(article.section)}
          </Link>
          <h3 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(28, fs) }}>
            <Link
              href={`/article/${article.slug}`}
              className="hover:text-maroon transition-colors"
            >
              {article.title}
            </Link>
          </h3>
          <p className="mt-2 leading-[1.65] text-caption" style={{ fontSize: scalePx(16, fs) }}>
            {getPreviewText(article.body, featuredSlot.previewLength ?? 200)}
          </p>
          <div className="font-headline mt-3" style={{ fontSize: scalePx(14, fs) }}>
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

        {/* Right — hero image */}
        {heroImage && (() => {
          const imgCrop = imageSlot?.imageCrop ?? "original";
          const cropRatio = imgCrop === "landscape" ? "16/9" : imgCrop === "portrait" ? "3/4" : imgCrop === "square" ? "1/1" : imgCrop === "custom" && imageSlot?.imageCropCustom ? imageSlot.imageCropCustom.replace(":", "/") : undefined;
          return (
            <div className="lg:w-[60%] relative">
              <img
                src={heroImage}
                alt={imageSlot?.mediaAlt ?? ""}
                className="w-full object-cover"
                style={cropRatio ? { aspectRatio: cropRatio } : { height: "100%" }}
              />
              {imageSlot?.mediaCredit && (
                <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">
                  {imageSlot.mediaCredit}
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Headline-only articles below — full width */}
      {headlineSlots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-200 flex gap-4 -mb-2">
          {headlineSlots.map((slot, idx) => {
            if (!slot.article) return null;
            const hlAuthor = slot.showByline ? getAuthorInfo(slot.article) : null;
            return (
              <div key={slot.id} className={`flex-1 ${idx < headlineSlots.length - 1 ? "border-r border-neutral-200 pr-4" : ""}`}>
                <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(18, slot.scale) }}>
                  <Link
                    href={`/article/${slot.article.slug}`}
                    className="hover:text-maroon transition-colors"
                  >
                    {slot.article.title}
                  </Link>
                </h4>
                {hlAuthor && (
                  <p className="font-headline mt-1" style={{ fontSize: scalePx(13, slot.scale) }}>
                    <Link href={`/profile/${hlAuthor.id}`} className="text-maroon font-semibold hover:underline">{hlAuthor.name}</Link>{" "}
                    <span className="italic">{hlAuthor.role}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
