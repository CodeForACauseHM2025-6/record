import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";

export function SbThumbnailsPattern({ slots }: { slots: PopulatedSlot[] }) {
  const displaySlots = slots.slice(0, 3).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div>
      {displaySlots.map((slot, idx) => {
        const article = slot.article!;
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const thumbSize = scalePx(40, slot.imageScale);
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        return (
          <div
            key={slot.id}
            className={`flex items-center gap-3 py-2.5 ${
              idx < displaySlots.length - 1 ? "border-b border-neutral-200" : ""
            }`}
          >
            {imgSrc && (
              <Link href={`/article/${article.slug}`} className="shrink-0">
                <img
                  src={imgSrc}
                  alt={slot.mediaAlt ?? article.title}
                  className="object-cover"
                  style={cropRatio ? { width: thumbSize, aspectRatio: cropRatio } : { width: thumbSize, height: thumbSize }}
                />
              </Link>
            )}
            <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(15, slot.scale) }}>
              <Link
                href={`/article/${article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {article.title}
              </Link>
            </h4>
          </div>
        );
      })}
    </div>
  );
}
