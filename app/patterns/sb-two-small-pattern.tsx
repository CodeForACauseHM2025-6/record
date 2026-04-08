import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";

export function SbTwoSmallPattern({ slots }: { slots: PopulatedSlot[] }) {
  const displaySlots = slots.slice(0, 2).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div className="flex gap-4">
      {displaySlots.map((slot) => {
        const article = slot.article!;
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        return (
          <div key={slot.id} className="flex-1">
            {imgSrc && (
              <Link href={`/article/${article.slug}`} className="block">
                <img
                  src={imgSrc}
                  alt={slot.mediaAlt ?? article.title}
                  className="w-full object-cover"
                  style={cropRatio ? { aspectRatio: cropRatio } : { height: scalePx(80, slot.imageScale) }}
                />
              </Link>
            )}
            <h4 className="font-headline font-bold leading-snug mt-1.5" style={{ fontSize: scalePx(16, slot.scale) }}>
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
