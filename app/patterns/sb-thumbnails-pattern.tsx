import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";

export function SbThumbnailsPattern({ slots }: { slots: PopulatedSlot[] }) {
  const displaySlots = slots.slice(0, 3).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div>
      {displaySlots.map((slot, idx) => {
        const article = slot.article!;
        return (
          <div
            key={slot.id}
            className={`flex items-center gap-3 py-2.5 ${
              idx < displaySlots.length - 1 ? "border-b border-neutral-200" : ""
            }`}
          >
            {article.featuredImage && (
              <Link href={`/article/${article.slug}`} className="shrink-0">
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-[40px] h-[40px] object-cover"
                />
              </Link>
            )}
            <h4 className="font-headline text-[15px] font-bold leading-snug">
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
