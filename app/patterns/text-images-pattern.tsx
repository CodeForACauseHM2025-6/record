import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
  formatDateShort,
} from "@/lib/article-helpers";

export function TextImagesPattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const articleSlot = slots[0] ?? null;
  const imageSlots = slots.slice(1, 3);

  const article = articleSlot?.article;
  if (!article) return null;

  const author = getAuthorInfo(article);
  const images = imageSlots.filter((s) => s.mediaUrl);
  const sc = articleSlot.scale;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left — article text */}
      <div className="lg:w-[40%]">
      {w(0, <div>
        {articleSlot.featured && (
          <span className="font-headline text-[10px] tracking-[0.1em] uppercase text-maroon font-semibold">Featured</span>
        )}
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic"
          style={{ fontSize: scalePx(14, sc) }}
        >
          {getSectionLabel(article.section)}
        </Link>
        <h3 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(26, sc) }}>
          <Link
            href={`/article/${article.slug}`}
            className="hover:text-maroon transition-colors"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 leading-[1.65] text-caption" style={{ fontSize: scalePx(16, sc) }}>
          {getPreviewText(article.body, articleSlot.previewLength ?? 200)}
        </p>
        <div className="font-headline mt-3" style={{ fontSize: scalePx(14, sc) }}>
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
      </div>)}
      </div>

      {/* Right — two tall images side by side */}
      {images.length > 0 && (
        <div className="lg:w-[60%] flex gap-3">
          {images.map((slot, idx) => {
            const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
            return <div key={slot.id} className="flex-1">
              {w(idx + 1, <div className="relative">
                <img
                  src={slot.mediaUrl!}
                  alt={slot.mediaAlt ?? ""}
                  className="w-full object-cover"
                  style={cropRatio ? { aspectRatio: cropRatio } : { height: "100%" }}
                />
                {slot.mediaCredit && (
                  <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">
                    {slot.mediaCredit}
                  </span>
                )}
              </div>)}
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
