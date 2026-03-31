import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";

export function SbTwoSmallPattern({ slots }: { slots: PopulatedSlot[] }) {
  const displaySlots = slots.slice(0, 2).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div className="flex gap-4">
      {displaySlots.map((slot) => {
        const article = slot.article!;
        return (
          <div key={slot.id} className="flex-1">
            {article.featuredImage && (
              <Link href={`/article/${article.slug}`} className="block">
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-[80px] object-cover"
                />
              </Link>
            )}
            <h4 className="font-headline text-[16px] font-bold leading-snug mt-1.5">
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
