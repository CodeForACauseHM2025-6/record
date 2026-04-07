import Link from "next/link";
import { PopulatedSlot, SlotWrapper } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import {
  getPreviewText,
  getSectionLabel,
  getSectionHref,
  getAuthorInfo,
  formatDateShort,
} from "@/lib/article-helpers";

export function SingleFeaturePattern({ slots, wrapSlot }: { slots: PopulatedSlot[]; wrapSlot?: SlotWrapper }) {
  const w = (i: number, node: React.ReactNode) => wrapSlot ? wrapSlot(i, node) : node;
  const slot = slots[0] ?? null;
  const article = slot?.article;

  if (!article) return null;

  const author = getAuthorInfo(article);
  const sc = slot.scale;

  const imgSrc = slot.mediaUrl ?? article.featuredImage ?? null;
  const iFloat = slot.imageFloat ?? "full";
  const isFloated = iFloat === "left" || iFloat === "right";
  const cropRatio = slot.imageCrop === "landscape" ? "16/9" : slot.imageCrop === "portrait" ? "3/4" : slot.imageCrop === "square" ? "1/1" : slot.imageCrop === "custom" && slot.imageCropCustom ? slot.imageCropCustom.replace(":", "/") : undefined;

  if (isFloated && imgSrc) {
    return w(0,
      <div className="overflow-hidden">
        <div
          className={`relative ${iFloat === "left" ? "float-left mr-4 mb-2" : "float-right ml-4 mb-2"}`}
          style={{
            width: `${slot.imageWidth ?? 50}%`,
            ...(cropRatio ? { aspectRatio: cropRatio } : {}),
          }}
        >
          <Link href={`/article/${article.slug}`} className="block">
            <img
              src={imgSrc}
              alt={slot.mediaAlt ?? article.title}
              className="w-full h-full object-cover"
            />
          </Link>
          {slot.mediaCredit && (
            <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
          )}
        </div>
        {slot.featured && (
          <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
        )}
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic"
          style={{ fontSize: scalePx(14, sc) }}
        >
          {getSectionLabel(article.section)}
        </Link>
        <h3 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(28, sc) }}>
          <Link href={`/article/${article.slug}`} className="hover:text-maroon transition-colors">
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 leading-[1.65] text-caption" style={{ fontSize: scalePx(16, sc) }}>
          {getPreviewText(article.body, slot.previewLength ?? 220)}
        </p>
        <div className="font-headline mt-3" style={{ fontSize: scalePx(14, sc) }}>
          <Link href={`/profile/${author.id}`} className="text-maroon font-semibold hover:underline">{author.name}</Link>{" "}
          <span className="italic">{author.role}</span>
          {article.publishedAt && <span className="text-caption ml-2">&middot; {formatDateShort(article.publishedAt)}</span>}
        </div>
        <div style={{ clear: "both" }} />
      </div>
    );
  }

  return w(0,
    <div>
      {imgSrc && (
        <div className="relative">
          <Link href={`/article/${article.slug}`} className="block">
            <img
              src={imgSrc}
              alt={slot.mediaAlt ?? article.title}
              className="w-full object-cover"
              style={cropRatio ? { aspectRatio: cropRatio } : undefined}
            />
          </Link>
          {slot.mediaCredit && (
            <span className="absolute bottom-1 right-1 font-headline text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5">{slot.mediaCredit}</span>
          )}
        </div>
      )}
      <div className="mt-4">
        {slot.featured && (
          <span className="block font-headline text-[10px] tracking-[0.1em] uppercase text-white font-semibold bg-maroon px-2 py-0.5 w-fit mb-1">Featured</span>
        )}
        <Link
          href={getSectionHref(article.section)}
          className="font-headline text-maroon italic"
          style={{ fontSize: scalePx(14, sc) }}
        >
          {getSectionLabel(article.section)}
        </Link>
        <h3 className="font-headline font-bold leading-snug mt-1" style={{ fontSize: scalePx(28, sc) }}>
          <Link
            href={`/article/${article.slug}`}
            className="hover:text-maroon transition-colors"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 leading-[1.65] text-caption" style={{ fontSize: scalePx(16, sc) }}>
          {getPreviewText(article.body, slot.previewLength ?? 220)}
        </p>
        <div className="font-headline mt-3" style={{ fontSize: scalePx(14, sc) }}>
          <Link
            href={`/profile/${author.id}`}
            className="text-maroon font-semibold hover:underline"
          >
            {author.name}
          </Link>{" "}
          <span className="italic">{author.role}</span>
          {article.publishedAt && (
            <span className="text-caption ml-2">
              &middot; {formatDateShort(article.publishedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
