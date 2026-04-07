import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
} from "@/lib/article-helpers";

export function SbTwoSmallPattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const displaySlots = slots.slice(0, 2).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div className="flex gap-4">
      {displaySlots.map((slot, idx) => {
        const article = slot.article!;
        const author = getAuthorInfo(article);
        const sc = slot.scale;
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        return <div key={slot.id} className="flex-1">
          {w(idx, <div>
            {imgSrc && (
              <div className="relative">
                <Link href={`/article/${article.slug}`} className="block">
                  <img
                    src={imgSrc}
                    alt={slot.mediaAlt ?? article.title}
                    className="w-full object-cover"
                    style={cropRatio ? { aspectRatio: cropRatio } : { height: scalePx(80, slot.imageScale) }}
                  />
                </Link>
                {slot.mediaCredit && (
                  <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
                )}
              </div>
            )}
            <Link
              href={getSectionHref(article.section)}
              className="font-headline text-maroon italic mt-1.5 inline-block"
              style={{ fontSize: scalePx(12, sc) }}
            >
              {getSectionLabel(article.section)}
            </Link>
            <h4 className="font-headline font-bold leading-snug mt-0.5" style={{ fontSize: scalePx(16, sc) }}>
              <Link
                href={`/article/${article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {article.title}
              </Link>
            </h4>
            <div className="font-headline mt-1" style={{ fontSize: scalePx(12, sc) }}>
              <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
              <span className="italic">{author.role}</span>
            </div>
          </div>)}
        </div>;
      })}
    </div>
  );
}
