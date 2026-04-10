import Link from "next/link";
import { PopulatedSlot } from "@/app/patterns/types";
import { scalePx } from "@/lib/scale";
import { getAuthorInfo } from "@/lib/article-helpers";
import { EditableSlot, getPlaceholderArticle } from "@/app/patterns/editable";

export function HeadlineStackPattern({
  slots,
  editMode = false,
}: {
  slots: PopulatedSlot[];
  editMode?: boolean;
}) {
  const headlineSlots = slots.slice(0, 3);
  if (!editMode && headlineSlots.every((s) => !s?.article)) return null;

  return (
    <div>
      {headlineSlots.map((slot, idx) => {
        const article = slot?.article ?? getPlaceholderArticle();
        const author = slot?.showByline ? getAuthorInfo(article) : null;
        return (
          <div
            key={slot?.id ?? idx}
            className={`py-3 ${
              idx < headlineSlots.length - 1 ? "border-b-2 border-black" : ""
            }`}
          >
            <EditableSlot slot={slot}>
              <>
                <h3
                  className="font-headline font-bold leading-snug"
                  style={{ fontSize: scalePx(26, slot?.scale) }}
                >
                  <Link
                    href={`/article/${article.slug}`}
                    className="hover:text-maroon transition-colors"
                  >
                    {article.title}
                  </Link>
                </h3>
                {author && (
                  <p
                    className="font-headline mt-1"
                    style={{ fontSize: scalePx(14, slot?.scale) }}
                  >
                    <Link
                      href={`/profile/${author.id}`}
                      className="text-maroon font-semibold hover:underline"
                    >
                      {author.name}
                    </Link>
                    {author.role && (
                      <>
                        {" "}
                        <span className="italic">{author.role}</span>
                      </>
                    )}
                  </p>
                )}
              </>
            </EditableSlot>
          </div>
        );
      })}
    </div>
  );
}
