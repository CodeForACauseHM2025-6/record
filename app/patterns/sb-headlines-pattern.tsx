import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import { getAuthorInfo } from "@/lib/article-helpers";

export function SbHeadlinesPattern({ slots }: { slots: PopulatedSlot[] }) {
  const headlineSlots = slots.slice(0, 3).filter((s) => s.article);

  if (headlineSlots.length === 0) return null;

  return (
    <div>
      {headlineSlots.map((slot, idx) => {
        const author = slot.showByline ? getAuthorInfo(slot.article!) : null;
        return (
          <div
            key={slot.id}
            className={`py-2 ${
              idx < headlineSlots.length - 1 ? "border-b border-neutral-200" : ""
            }`}
          >
            <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(16, slot.scale) }}>
              <Link
                href={`/article/${slot.article!.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article!.title}
              </Link>
            </h4>
            {author && (
              <p className="font-headline mt-1" style={{ fontSize: scalePx(12, slot.scale) }}>
                <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
                <span className="italic">{author.role}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
