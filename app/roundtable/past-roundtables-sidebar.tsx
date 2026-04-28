import Link from "next/link";

interface SidebarRoundTable {
  id: string;
  slug: string;
  prompt: string;
  group: { publishedAt: Date | null } | null;
  sides: {
    label: string;
    order: number;
    authors: { user: { id: string; name: string; image: string | null } }[];
  }[];
}

const SIDE_THEMES = [
  { text: "#8B1A1A" },
  { text: "#555555" },
];

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function PastRoundTablesSidebar({
  items,
  currentSlug,
}: {
  items: SidebarRoundTable[];
  currentSlug?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <aside className="w-full">
      <div className="flex items-baseline gap-3">
        <h3 className="font-headline text-[11px] font-bold tracking-[0.18em] uppercase text-maroon">
          Past Round Tables
        </h3>
        <span className="font-headline text-[11px] text-caption">{items.length}</span>
      </div>
      <div className="mt-3 h-[2px] bg-maroon/40" />

      <ul className="mt-4 space-y-3">
        {items.map((rt) => {
          const isCurrent = rt.slug === currentSlug;
          // Up to 4 avatars total, mixing both sides
          const allAuthors = rt.sides.flatMap((s, sideIdx) =>
            s.authors.map((a) => ({ ...a.user, sideIdx })),
          );
          const shown = allAuthors.slice(0, 4);
          const overflow = allAuthors.length - shown.length;

          return (
            <li key={rt.id}>
              <Link
                href={`/roundtable/${rt.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`block group rounded-sm border px-4 py-3.5 transition-all ${
                  isCurrent
                    ? "border-maroon bg-maroon/5"
                    : "border-neutral-200 hover:border-maroon/40 hover:bg-maroon/[0.02]"
                }`}
              >
                <p className="font-headline text-[14px] font-bold leading-snug group-hover:text-maroon transition-colors line-clamp-2">
                  {rt.prompt || "Untitled"}
                </p>

                {/* Avatar stack */}
                {shown.length > 0 && (
                  <div className="mt-2.5 flex items-center">
                    <div className="flex -space-x-2">
                      {shown.map((a) => {
                        const theme = SIDE_THEMES[a.sideIdx] ?? SIDE_THEMES[0];
                        return (
                          <div
                            key={`${a.id}-${a.sideIdx}`}
                            className="w-7 h-7 rounded-full overflow-hidden bg-neutral-100"
                            style={{
                              boxShadow: `0 0 0 1.5px white, 0 0 0 3px ${theme.text}`,
                            }}
                            title={a.name}
                          >
                            {a.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.image}
                                alt={a.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center font-headline font-bold text-white text-[10px]"
                                style={{ backgroundColor: theme.text }}
                              >
                                {initials(a.name)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {overflow > 0 && (
                      <span className="ml-3 font-headline text-[11px] text-caption">
                        +{overflow} more
                      </span>
                    )}
                  </div>
                )}

                <p className="mt-2 font-headline text-[11px] tracking-wide text-caption">
                  {rt.group?.publishedAt && formatDateShort(rt.group.publishedAt)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
