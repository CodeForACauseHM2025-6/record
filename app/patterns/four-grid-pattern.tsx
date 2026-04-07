import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
} from "@/lib/article-helpers";

export function FourGridPattern({ slots }: { slots: PopulatedSlot[] }) {
  const topSlots = slots.slice(0, 2);
  const bottomSlots = slots.slice(2, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      {/* Top row — headline + excerpt + byline, no image */}
      {topSlots.map((slot) => {
        if (!slot.article) return null;
        const author = getAuthorInfo(slot.article);
        const sc = slot.scale;
        return (
          <div key={slot.id}>
            {slot.featured && (
              <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
            )}
            <Link
              href={getSectionHref(slot.article.section)}
              className="font-headline text-maroon italic"
              style={{ fontSize: scalePx(14, sc) }}
            >
              {getSectionLabel(slot.article.section)}
            </Link>
            <h4 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(20, sc) }}>
              <Link
                href={`/article/${slot.article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article.title}
              </Link>
            </h4>
            <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, sc) }}>
              {getPreviewText(slot.article.body, slot.previewLength ?? 120)}
            </p>
            <div className="font-headline mt-2" style={{ fontSize: scalePx(13, sc) }}>
              <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
              <span className="italic">{author.role}</span>
            </div>
          </div>
        );
      })}

      {/* Bottom row — image floated left + headline + excerpt + byline */}
      {bottomSlots.map((slot) => {
        if (!slot.article) return null;
        const author = getAuthorInfo(slot.article);
        const sc = slot.scale;
        const imgSrc = slot.mediaUrl ?? slot.article.featuredImage ?? null;
        const iFloat = slot.imageFloat ?? "left";
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;

        return (
          <div key={slot.id} className="overflow-hidden">
            {imgSrc && (
              <div
                className={`relative ${iFloat === "right" ? "float-right ml-4 mb-2" : "float-left mr-4 mb-2"}`}
                style={{
                  width: `${slot.imageWidth ?? 50}%`,
                  ...(cropRatio ? { aspectRatio: cropRatio } : {}),
                }}
              >
                <Link href={`/article/${slot.article.slug}`} className="block">
                  <img
                    src={imgSrc}
                    alt={slot.mediaAlt ?? slot.article.title}
                    className="w-full h-full object-cover"
                  />
                </Link>
                {slot.mediaCredit && (
                  <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
                )}
              </div>
            )}
            {slot.featured && (
              <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
            )}
            <Link
              href={getSectionHref(slot.article.section)}
              className="font-headline text-maroon italic"
              style={{ fontSize: scalePx(14, sc) }}
            >
              {getSectionLabel(slot.article.section)}
            </Link>
            <h4 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(20, sc) }}>
              <Link
                href={`/article/${slot.article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article.title}
              </Link>
            </h4>
            <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, sc) }}>
              {getPreviewText(slot.article.body, slot.previewLength ?? 180)}
            </p>
            <div className="font-headline mt-2" style={{ fontSize: scalePx(13, sc) }}>
              <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
              <span className="italic">{author.role}</span>
            </div>
            <div style={{ clear: "both" }} />
          </div>
        );
      })}
    </div>
  );
}
