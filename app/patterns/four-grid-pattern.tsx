import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
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
            <h4 className="font-headline text-[20px] font-bold leading-snug">
              <Link
                href={`/article/${slot.article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article.title}
              </Link>
            </h4>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-caption">
              {getPreviewText(slot.article.body, 120)}
            </p>
          </div>
        );
      })}

      {/* Bottom row — small thumbnail + headline */}
      {bottomSlots.map((slot) => {
        if (!slot.article) return null;
        return (
          <div key={slot.id} className="flex items-start gap-3">
            {slot.article.featuredImage && (
              <Link href={`/article/${slot.article.slug}`} className="shrink-0">
                <img
                  src={slot.article.featuredImage}
                  alt={slot.article.title}
                  className="w-[60px] h-[60px] object-cover"
                />
              </Link>
            )}
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
  );
}
