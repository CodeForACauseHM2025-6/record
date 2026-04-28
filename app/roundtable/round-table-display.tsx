import Link from "next/link";

interface SideData {
  id: string;
  label: string;
  order: number;
  authors: { user: { id: string; name: string; image: string | null } }[];
}

interface TurnData {
  id: string;
  sideId: string;
  body: string;
  order: number;
}

interface RoundTableData {
  prompt: string;
  publishedAt: Date | null;
  sides: SideData[];
  turns: TurnData[];
}

const SIDE_THEMES = [
  { text: "#8B1A1A", soft: "rgba(139, 26, 26, 0.07)", border: "rgba(139, 26, 26, 0.30)" },
  { text: "#3F3F3F", soft: "rgba(63, 63, 63, 0.08)", border: "rgba(63, 63, 63, 0.40)" },
];

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({
  user,
  size,
  ring,
}: {
  user: { name: string; image: string | null };
  size: number;
  ring: string;
}) {
  return (
    <div
      className="rounded-full overflow-hidden bg-neutral-100 shrink-0"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 2px white, 0 0 0 3px ${ring}`,
      }}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-headline font-bold text-white"
          style={{ backgroundColor: ring, fontSize: size * 0.38 }}
        >
          {initials(user.name)}
        </div>
      )}
    </div>
  );
}

function sideName(label: string, idx: number): string {
  return label?.trim() || `Side ${idx + 1}`;
}

export function RoundTableDisplay({ data }: { data: RoundTableData }) {
  const sortedSides = [...data.sides].sort((a, b) => a.order - b.order);
  const sideById: Record<string, SideData> = {};
  const sideIndexById: Record<string, number> = {};
  sortedSides.forEach((s, i) => {
    sideById[s.id] = s;
    sideIndexById[s.id] = i;
  });
  const sortedTurns = [...data.turns].sort((a, b) => a.order - b.order);

  return (
    <article>
      {/* Prompt */}
      <header className="text-center max-w-[820px] mx-auto">
        <p
          className="font-headline text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: SIDE_THEMES[0].text }}
        >
          The Round Table
        </p>
        {data.publishedAt && (
          <p className="mt-1 font-headline text-[12px] text-caption">
            {formatDateLong(data.publishedAt)}
          </p>
        )}
        <h1 className="mt-5 font-headline text-[30px] sm:text-[40px] lg:text-[48px] font-bold leading-[1.15]">
          {data.prompt}
        </h1>
        <div className="mt-6 mx-auto flex items-center justify-center gap-3">
          <span className="h-[3px] w-12 rounded" style={{ backgroundColor: SIDE_THEMES[0].text }} />
          <span className="font-headline text-[10px] font-semibold tracking-[0.22em] uppercase text-caption">
            vs
          </span>
          <span className="h-[3px] w-12 rounded" style={{ backgroundColor: SIDE_THEMES[1].text }} />
        </div>
      </header>

      {/* Sides intro with pfps */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {sortedSides.map((side, i) => {
          const theme = SIDE_THEMES[i] ?? SIDE_THEMES[0];
          return (
            <div
              key={side.id}
              className="rounded-sm px-5 py-5"
              style={{ backgroundColor: theme.soft, boxShadow: `inset 0 0 0 1px ${theme.border}` }}
            >
              <p
                className="font-headline text-[11px] font-bold tracking-[0.18em] uppercase"
                style={{ color: theme.text }}
              >
                {sideName(side.label, i)}
              </p>
              {side.authors.length === 0 ? (
                <p className="mt-2 font-headline text-[14px] italic text-caption">
                  No authors
                </p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
                  {side.authors.map((a) => (
                    <li key={a.user.id} className="flex items-center gap-2.5">
                      <Avatar user={a.user} size={36} ring={theme.text} />
                      <Link
                        href={`/profile/${a.user.id}`}
                        className="font-headline text-[14px] font-semibold hover:underline"
                        style={{ color: theme.text }}
                      >
                        {a.user.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Turns */}
      {sortedTurns.length > 0 ? (
        <div className="mt-12 space-y-7">
          {sortedTurns.map((turn) => {
            const side = sideById[turn.sideId];
            if (!side) return null;
            const sIdx = sideIndexById[turn.sideId] ?? 0;
            const theme = SIDE_THEMES[sIdx] ?? SIDE_THEMES[0];
            const isLeft = sIdx === 0;
            return (
              <div
                key={turn.id}
                className={`${
                  isLeft ? "sm:pr-12" : "sm:pl-12 sm:ml-auto"
                } sm:max-w-[80%]`}
              >
                <div className={`flex items-center gap-2.5 ${isLeft ? "" : "sm:flex-row-reverse"}`}>
                  <div className={`flex -space-x-2 ${isLeft ? "" : "sm:flex-row-reverse sm:space-x-reverse"}`}>
                    {side.authors.slice(0, 3).map((a) => (
                      <Avatar key={a.user.id} user={a.user} size={28} ring={theme.text} />
                    ))}
                  </div>
                  <p
                    className="font-headline text-[10px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: theme.text }}
                  >
                    {sideName(side.label, sIdx)}
                    {side.authors.length > 0 && (
                      <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                        &mdash; {side.authors.map((a) => a.user.name).join(" & ")}
                      </span>
                    )}
                  </p>
                </div>
                <div
                  className={`mt-3 font-body text-[17px] leading-[1.7] whitespace-pre-wrap pt-3 ${isLeft ? "sm:text-left" : "sm:text-right"}`}
                  style={{ borderTop: `2px solid ${theme.text}` }}
                >
                  {turn.body}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-12 text-center font-headline text-[15px] text-caption italic">
          No arguments published yet.
        </p>
      )}
    </article>
  );
}
