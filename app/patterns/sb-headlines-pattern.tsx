import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";

export function SbHeadlinesPattern({ slots }: { slots: PopulatedSlot[] }) {
  const headlineSlots = slots.slice(0, 3).filter((s) => s.article);

  if (headlineSlots.length === 0) return null;

  return (
    <div>
      {headlineSlots.map((slot, idx) => (
        <div
          key={slot.id}
          className={`py-2 ${
            idx < headlineSlots.length - 1 ? "border-b border-neutral-200" : ""
          }`}
        >
          <h4 className="font-headline text-[16px] font-bold leading-snug">
            <Link
              href={`/article/${slot.article!.slug}`}
              className="hover:text-maroon transition-colors"
            >
              {slot.article!.title}
            </Link>
          </h4>
        </div>
      ))}
    </div>
  );
}
