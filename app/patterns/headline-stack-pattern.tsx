import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import { getAuthorInfo } from "@/lib/article-helpers";

export function HeadlineStackPattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const headlineSlots = slots.slice(0, 3).filter((s) => s.article);

  if (headlineSlots.length === 0) return null;

  return (
    <div>
      {headlineSlots.map((slot, idx) => {
        const author = slot.showByline ? getAuthorInfo(slot.article!) : null;
        return w(idx,
          <div
            key={slot.id}
            className={`py-3 ${
              idx < headlineSlots.length - 1 ? "border-b-2 border-black" : ""
            }`}
          >
            <h3 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(26, slot.scale) }}>
              <Link
                href={`/article/${slot.article!.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {slot.article!.title}
              </Link>
            </h3>
            {author && (
              <p className="font-headline mt-1" style={{ fontSize: scalePx(14, slot.scale) }}>
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
