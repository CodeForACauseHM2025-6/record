import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import { getPreviewText } from "@/lib/article-helpers";

export function FourGridPattern({ slots }: { slots: PopulatedSlot[] }) {
  const topSlots = slots.slice(0, 2);
  const bottomSlots = slots.slice(2, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      {/* Top row — headline + short excerpt, no image */}
      {topSlots.map((slot) => {
        if (!slot.article) return null;
        return (
          <div key={slot.id}>
            {slot.featured && (
              <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
            )}
            <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(20, slot.scale) }}>
              <Link
                href={`/article/${slot.article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article.title}
              </Link>
            </h4>
            <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, slot.scale) }}>
              {getPreviewText(slot.article.body, slot.previewLength ?? 120)}
            </p>
          </div>
        );
      })}

      {/* Bottom row — small thumbnail + headline */}
      {bottomSlots.map((slot) => {
        if (!slot.article) return null;
        const imgSrc = slot.mediaUrl ?? slot.article.featuredImage ?? null;
        const imgSize = scalePx(60, slot.imageScale);
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        return (
          <div key={slot.id} className="flex items-start gap-3">
            {imgSrc && (
              <Link href={`/article/${slot.article.slug}`} className="shrink-0">
                <img
                  src={imgSrc}
                  alt={slot.mediaAlt ?? slot.article.title}
                  className="object-cover"
                  style={cropRatio ? { width: imgSize, aspectRatio: cropRatio } : { width: imgSize, height: imgSize }}
                />
              </Link>
            )}
            <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(18, slot.scale) }}>
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
  );
}
