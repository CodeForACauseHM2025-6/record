import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
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
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        const iFloat = slot.imageFloat ?? "full";
        const isFloated = iFloat === "left" || iFloat === "right";

        if (isFloated && imgSrc) {
          return (
            <div key={slot.id} className="overflow-hidden">
              <Link
                href={`/article/${article.slug}`}
                className={`block ${iFloat === "left" ? "float-left mr-3 mb-1" : "float-right ml-3 mb-1"}`}
                style={{ width: `${slot.imageWidth ?? 40}%`, ...(cropRatio ? { aspectRatio: cropRatio } : {}) }}
              >
                <img src={imgSrc} alt={slot.mediaAlt ?? article.title} className="w-full h-full object-cover" />
              </Link>
              {slot.featured && (
                <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mt-2 mb-1">Featured</span>
              )}
              <h4 className="font-headline font-bold leading-snug mt-2" style={{ fontSize: scalePx(20, slot.scale) }}>
                <Link href={`/article/${article.slug}`} className="hover:text-maroon transition-colors">{article.title}</Link>
              </h4>
              <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, slot.scale) }}>
                {getPreviewText(article.body, slot.previewLength ?? 100)}
              </p>
              <Link href={getSectionHref(article.section)} className="font-headline text-maroon italic mt-1.5 inline-block" style={{ fontSize: scalePx(13, slot.scale) }}>
                {getSectionLabel(article.section)}
              </Link>
              <div style={{ clear: "both" }} />
            </div>
          );
        }

        return (
          <div key={slot.id}>
            {imgSrc && (
              <Link href={`/article/${article.slug}`} className="block">
                <img
                  src={imgSrc}
                  alt={slot.mediaAlt ?? article.title}
                  className="w-full object-cover"
                  style={cropRatio ? { aspectRatio: cropRatio } : { height: scalePx(150, slot.imageScale) }}
                />
              </Link>
            )}
            {slot.featured && (
              <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mt-2 mb-1">Featured</span>
            )}
            <h4 className="font-headline font-bold leading-snug mt-2" style={{ fontSize: scalePx(20, slot.scale) }}>
              <Link
                href={`/article/${article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {article.title}
              </Link>
            </h4>
            <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, slot.scale) }}>
              {getPreviewText(article.body, slot.previewLength ?? 100)}
            </p>
            <Link
              href={getSectionHref(article.section)}
              className="font-headline text-maroon italic mt-1.5 inline-block"
              style={{ fontSize: scalePx(13, slot.scale) }}
            >
              {getSectionLabel(article.section)}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
