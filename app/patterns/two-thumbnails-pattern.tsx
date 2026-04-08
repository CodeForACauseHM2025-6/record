import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
} from "@/lib/article-helpers";

export function TwoThumbnailsPattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const displaySlots = slots.slice(0, 2).filter((s) => s.article);

  if (displaySlots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {displaySlots.map((slot, idx) => {
        const article = slot.article!;
        const author = getAuthorInfo(article);
        const sc = slot.scale;
        const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
        const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;
        const iFloat = slot.imageFloat ?? "full";
        const isFloated = iFloat === "left" || iFloat === "right";

        if (isFloated && imgSrc) {
          return w(idx,
            <div key={slot.id} className="overflow-hidden">
              <div
                data-img-container
                className={`relative ${iFloat === "left" ? "float-left mr-3 mb-1" : "float-right ml-3 mb-1"}`}
                style={{ width: `${slot.imageWidth ?? 40}%`, ...(cropRatio ? { aspectRatio: cropRatio } : {}) }}
              >
                <Link href={`/article/${article.slug}`} className="block">
                  <img src={imgSrc} alt={slot.mediaAlt ?? article.title} className="w-full h-full object-cover" />
                </Link>
                {slot.mediaCredit && (
                  <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
                )}
              </div>
              {slot.featured && (
                <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mt-2 mb-1">Featured</span>
              )}
              <Link href={getSectionHref(article.section)} className="font-headline text-maroon italic mt-2 inline-block" style={{ fontSize: scalePx(13, sc) }}>
                {getSectionLabel(article.section)}
              </Link>
              <h4 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(20, sc) }}>
                <Link href={`/article/${article.slug}`} className="hover:text-maroon transition-colors">{article.title}</Link>
              </h4>
              <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, sc) }}>
                {getPreviewText(article.body, slot.previewLength ?? 100)}
              </p>
              <div className="font-headline mt-2" style={{ fontSize: scalePx(13, sc) }}>
                <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
                <span className="italic">{author.role}</span>
              </div>
              <div style={{ clear: "both" }} />
            </div>
          );
        }

        return w(idx,
          <div key={slot.id}>
            {imgSrc && (
              <div className="relative">
                <Link href={`/article/${article.slug}`} className="block">
                  <img
                    src={imgSrc}
                    alt={slot.mediaAlt ?? article.title}
                    className="w-full object-cover"
                    style={cropRatio ? { aspectRatio: cropRatio } : { height: scalePx(150, slot.imageScale) }}
                  />
                </Link>
                {slot.mediaCredit && (
                  <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
                )}
              </div>
            )}
            {slot.featured && (
              <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mt-2 mb-1">Featured</span>
            )}
            <Link
              href={getSectionHref(article.section)}
              className="font-headline text-maroon italic mt-2 inline-block"
              style={{ fontSize: scalePx(13, sc) }}
            >
              {getSectionLabel(article.section)}
            </Link>
            <h4 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(20, sc) }}>
              <Link
                href={`/article/${article.slug}`}
                className="hover:text-maroon transition-colors"
              >
                {article.title}
              </Link>
            </h4>
            <p className="mt-1.5 leading-[1.6] text-caption" style={{ fontSize: scalePx(15, sc) }}>
              {getPreviewText(article.body, slot.previewLength ?? 100)}
            </p>
            <div className="font-headline mt-2" style={{ fontSize: scalePx(13, sc) }}>
              <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
              <span className="italic">{author.role}</span>
            </div>
          </div>
        );
      })
}
    </div>
  );
}
