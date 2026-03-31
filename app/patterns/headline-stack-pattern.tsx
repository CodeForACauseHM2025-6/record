import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";

export function HeadlineStackPattern({ slots }: { slots: PopulatedSlot[] }) {
  const headlineSlots = slots.slice(0, 3).filter((s) => s.article);

  if (headlineSlots.length === 0) return null;

  return (
    <div>
      {headlineSlots.map((slot, idx) => (
        <div
          key={slot.id}
          className={`py-3 ${
            idx < headlineSlots.length - 1 ? "border-b-2 border-black" : ""
          }`}
        >
          <h3 className="font-headline text-[22px] sm:text-[26px] font-bold leading-snug">
            <Link
              href={`/article/${slot.article!.slug}`}
              className="hover:text-maroon transition-colors"
            >
              {slot.article!.title}
            </Link>
          </h3>
        </div>
      ))}
    </div>
  );
}
