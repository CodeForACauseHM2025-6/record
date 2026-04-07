import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
} from "@/lib/article-helpers";

export function SbThumbnailsPattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const displaySlots = slots.slice(0, 3).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div>
      {displaySlots.map((slot, idx) => {
        const article = slot.article!;
        const author = getAuthorInfo(article);
        const sc = slot.scale;
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const thumbSize = scalePx(40, slot.imageScale);
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        return w(idx,
          <div
            key={slot.id}
            className={`flex items-start gap-3 py-2.5 ${
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
            <div>
              <Link
                href={getSectionHref(article.section)}
                className="font-headline text-maroon italic"
                style={{ fontSize: scalePx(11, sc) }}
              >
                {getSectionLabel(article.section)}
              </Link>
              <h4 className="font-headline font-bold leading-snug" style={{ fontSize: scalePx(15, sc) }}>
                <Link
                  href={`/article/${article.slug}`}
                  className="hover:text-maroon transition-colors"
                >
                  {article.title}
                </Link>
              </h4>
              <div className="font-headline mt-0.5" style={{ fontSize: scalePx(11, sc) }}>
                <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
                <span className="italic">{author.role}</span>
              </div>
            </div>
          </div>
        );
      })
}
    </div>
  );
}
