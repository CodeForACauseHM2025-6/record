import Link from "next/link";

interface SideData {
  id: string;
  label: string;
  order: number;
  authors: { user: { id: string; name: string } }[];
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

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function RoundTableDisplay({ data }: { data: RoundTableData }) {
  const sortedSides = [...data.sides].sort((a, b) => a.order - b.order);
  const sideById: Record<string, SideData> = {};
  sortedSides.forEach((s) => {
    sideById[s.id] = s;
  });
  const sortedTurns = [...data.turns].sort((a, b) => a.order - b.order);

  return (
    <article>
      {/* Prompt */}
      <header className="text-center max-w-[820px] mx-auto">
        <p className="font-headline text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] uppercase text-maroon">
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
        <div className="mt-6 mx-auto h-[2px] w-16 bg-rule" />
      </header>

      {/* Sides intro */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[820px] mx-auto">
        {sortedSides.map((side, i) => (
          <div
            key={side.id}
            className={i === 0 ? "sm:text-left" : "sm:text-right"}
          >
            <p className="font-headline text-[11px] font-semibold tracking-[0.16em] uppercase text-caption">
              {side.label}
            </p>
            <p className="mt-1 font-headline text-[15px]">
              {side.authors.length === 0 ? (
                <span className="italic text-caption">No authors</span>
              ) : (
                side.authors.map((a, idx) => (
                  <span key={a.user.id}>
                    <Link
                      href={`/profile/${a.user.id}`}
                      className="text-maroon font-semibold hover:underline"
                    >
                      {a.user.name}
                    </Link>
                    {idx < side.authors.length - 1 ? ", " : ""}
                  </span>
                ))
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Turns */}
      {sortedTurns.length > 0 ? (
        <div className="mt-12 max-w-[820px] mx-auto space-y-8">
          {sortedTurns.map((turn) => {
            const side = sideById[turn.sideId];
            if (!side) return null;
            const isLeft = side.order === 0;
            const authorNames = side.authors.map((a) => a.user.name).join(" & ");
            return (
              <div
                key={turn.id}
                className={`${
                  isLeft ? "sm:pr-12 sm:text-left" : "sm:pl-12 sm:text-right sm:ml-auto"
                } sm:max-w-[80%]`}
              >
                <p
                  className={`font-headline text-[10px] font-semibold tracking-[0.18em] uppercase ${
                    isLeft ? "text-maroon" : "text-ink"
                  }`}
                >
                  {side.label}
                  {authorNames && (
                    <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                      &mdash; {authorNames}
                    </span>
                  )}
                </p>
                <div
                  className={`mt-3 font-body text-[17px] leading-[1.7] whitespace-pre-wrap border-t border-rule pt-3`}
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
