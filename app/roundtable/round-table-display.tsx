"use client";

import { useState, useEffect, useRef } from "react";
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
  publishedAt: Date | string | null;
  sides: SideData[];
  turns: TurnData[];
}

const SIDE_THEMES = [
  {
    text: "#8B1A1A",
    soft: "rgba(139, 26, 26, 0.10)",
    softer: "rgba(139, 26, 26, 0.05)",
  },
  {
    text: "#1F4E79",
    soft: "rgba(31, 78, 121, 0.10)",
    softer: "rgba(31, 78, 121, 0.05)",
  },
];

const ANIM_MS = 750;

function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function sideName(side: SideData | undefined, idx: number): string {
  return side?.label?.trim() || `Side ${idx + 1}`;
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
  if (user.image) {
    return (
      <img
        src={user.image}
        alt={user.name}
        className="rounded-full object-cover bg-neutral-100"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 0 2px white, 0 0 0 4px ${ring}`,
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-headline font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: ring,
        fontSize: size * 0.38,
        boxShadow: `0 0 0 2px white, 0 0 0 4px ${ring}`,
      }}
    >
      {initials(user.name)}
    </div>
  );
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

  // Each card has a cumulative angle. Active card sits at 180° (front/bottom).
  // Cards yet to enter sit at 0° (top/back, hidden). Cards that have exited sit at 360° (top/back).
  const [activeIdx, setActiveIdx] = useState(0);
  const [angles, setAngles] = useState<number[]>(() =>
    sortedTurns.map((_, i) => (i === 0 ? 180 : 0))
  );
  const [animating, setAnimating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function navigate(delta: 1 | -1) {
    if (animating) return;
    const next = activeIdx + delta;
    if (next < 0 || next >= sortedTurns.length) return;
    // The current active rotates by 180° in the direction of travel.
    // The card that's becoming active also rotates 180° in the same direction.
    setAngles((cur) =>
      cur.map((a, i) => {
        if (i === activeIdx) return a + 180 * delta;
        if (i === next) return a + 180 * delta;
        return a;
      })
    );
    setActiveIdx(next);
    setAnimating(true);
    window.setTimeout(() => setAnimating(false), ANIM_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (expanded) return;
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, animating, expanded]);

  const activeTurn = sortedTurns[activeIdx];
  const activeSideIdx = activeTurn ? sideIndexById[activeTurn.sideId] ?? 0 : 0;
  const activeSide = activeTurn ? sideById[activeTurn.sideId] : undefined;
  const activeTheme = SIDE_THEMES[activeSideIdx] ?? SIDE_THEMES[0];

  // Measure container so we can size the orbit radius responsively
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [tableSize, setTableSize] = useState(560);
  useEffect(() => {
    function measure() {
      if (!tableRef.current) return;
      const rect = tableRef.current.getBoundingClientRect();
      setTableSize(Math.min(rect.width, rect.height));
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (tableRef.current) ro.observe(tableRef.current);
    return () => ro.disconnect();
  }, []);

  const radius = tableSize * 0.42; // distance from center where the card "rides"
  const cardWidth = Math.min(tableSize * 0.72, 480);
  const cardHeight = Math.min(tableSize * 0.42, 240);

  return (
    <div className="h-full w-full flex flex-col px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-4">
      {/* Header */}
      <header className="text-center max-w-[820px] mx-auto w-full shrink-0">
        <p
          className="font-headline text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: SIDE_THEMES[0].text }}
        >
          The Round Table
          {data.publishedAt && (
            <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
              · {formatDateLong(data.publishedAt)}
            </span>
          )}
        </p>
        <h1 className="mt-1.5 font-headline text-[22px] sm:text-[28px] lg:text-[32px] font-bold leading-tight">
          {data.prompt || "—"}
        </h1>
        <div className="mt-3 mx-auto flex items-center justify-center gap-2">
          <span className="h-[3px] w-8 rounded" style={{ backgroundColor: SIDE_THEMES[0].text }} />
          <span className="font-headline text-[10px] font-semibold tracking-[0.2em] uppercase text-caption">
            vs
          </span>
          <span className="h-[3px] w-8 rounded" style={{ backgroundColor: SIDE_THEMES[1].text }} />
        </div>
      </header>

      {/* Round table */}
      <div
        ref={tableRef}
        className="flex-1 min-h-0 w-full mt-3 relative mx-auto"
        style={{ maxWidth: 820 }}
      >
        {sortedTurns.length > 0 ? (
          <>
            {/* Outer ring */}
            <div
              className="absolute inset-2 rounded-full transition-colors duration-500 pointer-events-none"
              style={{
                border: `2px dashed ${activeTheme.text}40`,
                background: `radial-gradient(circle, ${activeTheme.soft} 0%, ${activeTheme.softer} 50%, transparent 80%)`,
              }}
            />

            {/* Side labels (top corners of the ring) */}
            {sortedSides.map((side, i) => {
              const theme = SIDE_THEMES[i] ?? SIDE_THEMES[0];
              const isLeft = i === 0;
              return (
                <div
                  key={side.id}
                  className={`absolute top-3 ${isLeft ? "left-4" : "right-4"} font-headline font-bold tracking-[0.18em] uppercase text-[11px] sm:text-[12px] pointer-events-none`}
                  style={{ color: theme.text }}
                >
                  {sideName(side, i)}
                </div>
              );
            })}

            {/* Author avatars positioned around perimeter */}
            {sortedSides.map((side, sideIdx) => {
              const theme = SIDE_THEMES[sideIdx] ?? SIDE_THEMES[0];
              const isLeft = sideIdx === 0;
              return side.authors.map((a, j) => {
                const total = side.authors.length;
                const arcStart = isLeft ? 110 : -70;
                const arcEnd = isLeft ? 250 : 70;
                const t = total === 1 ? 0.5 : j / (total - 1);
                const angleDeg = arcStart + (arcEnd - arcStart) * t;
                const angleRad = (angleDeg * Math.PI) / 180;
                const r = 0.46; // 46% of half-size
                const x = 50 + r * 100 * Math.cos(angleRad);
                const y = 50 + r * 100 * Math.sin(angleRad);
                const isSpeaking = activeSide?.id === side.id;
                const avatarSize = Math.max(36, Math.min(56, tableSize * 0.085));
                return (
                  <div
                    key={a.user.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      transition: `opacity 500ms ease, transform 500ms ease`,
                      opacity: isSpeaking ? 1 : 0.32,
                    }}
                  >
                    <div
                      className="flex flex-col items-center gap-1"
                      style={{
                        transform: isSpeaking ? "scale(1.1)" : "scale(1)",
                        transition: "transform 500ms cubic-bezier(0.5,0,0.3,1)",
                      }}
                    >
                      <Avatar user={a.user} size={avatarSize} ring={theme.text} />
                      <Link
                        href={`/profile/${a.user.id}`}
                        className="font-headline text-[10px] sm:text-[11px] font-semibold tracking-wide hover:underline whitespace-nowrap"
                        style={{ color: theme.text }}
                      >
                        {a.user.name}
                      </Link>
                    </div>
                  </div>
                );
              });
            })}

            {/* Orbiting turn cards. Each is wrapped in a rotator pinned to the table center. */}
            {sortedTurns.map((turn, i) => {
              const sIdx = sideIndexById[turn.sideId] ?? 0;
              const theme = SIDE_THEMES[sIdx] ?? SIDE_THEMES[0];
              const angle = angles[i];
              // Compute opacity from how close angle (mod 360) is to 180°
              const a = ((angle % 360) + 360) % 360;
              const dist = Math.abs(a - 180); // 0 at front, 180 at back
              const opacity = Math.max(0, 1 - dist / 90); // visible only in the front half (90° cone)

              return (
                <div
                  key={turn.id}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    // Rotator pinned to the table center
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: "50% 50%",
                    transition: `transform ${ANIM_MS}ms cubic-bezier(0.5, 0, 0.3, 1)`,
                  }}
                >
                  {/* Card sits radius-units above the rotator's center;
                      because the rotator rotates, the card travels along an arc.
                      Counter-rotate the card content so text stays upright. */}
                  <div
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(-50%, calc(-50% - ${0}px)) translateY(${radius}px) rotate(${-angle}deg)`,
                      width: cardWidth,
                      pointerEvents: i === activeIdx ? "auto" : "none",
                    }}
                  >
                    <div
                      className="rounded-2xl mx-auto bg-white relative"
                      style={{
                        width: cardWidth,
                        height: cardHeight,
                        opacity,
                        transition: `opacity ${ANIM_MS}ms ease`,
                        boxShadow: `0 12px 36px ${theme.text}30, 0 0 0 2px ${theme.text}`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      <div className="h-full flex flex-col px-5 py-4 sm:px-6 sm:py-5">
                        <div className="flex items-center justify-between gap-3 shrink-0">
                          <p
                            className="font-headline text-[10px] font-bold tracking-[0.2em] uppercase"
                            style={{ color: theme.text }}
                          >
                            {sideName(sortedSides[sIdx], sIdx)}
                            <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                              Turn {i + 1} of {sortedTurns.length}
                            </span>
                          </p>
                          {i === activeIdx && (
                            <button
                              type="button"
                              onClick={() => setExpanded(true)}
                              aria-label="Expand text"
                              className="cursor-pointer text-caption hover:text-ink transition-colors p-1 -mr-1"
                              title="Expand"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div
                          className="mt-2 flex-1 min-h-0 font-body text-[14px] sm:text-[15.5px] leading-[1.55] whitespace-pre-wrap text-ink overflow-hidden relative"
                          style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }}
                        >
                          {turn.body}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="font-headline text-[15px] text-caption italic">
              No arguments published yet.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {sortedTurns.length > 0 && (
        <div className="shrink-0 mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={activeIdx === 0 || animating}
            aria-label="Previous turn"
            className="cursor-pointer w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              border: `2px solid ${activeTheme.text}`,
              color: activeTheme.text,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            {sortedTurns.map((t, i) => {
              const tIdx = sideIndexById[t.sideId] ?? 0;
              const tTheme = SIDE_THEMES[tIdx] ?? SIDE_THEMES[0];
              const isActive = i === activeIdx;
              return (
                <span
                  key={t.id}
                  aria-hidden="true"
                  className="transition-all rounded-full"
                  style={{
                    width: isActive ? 24 : 7,
                    height: 7,
                    backgroundColor: isActive ? tTheme.text : `${tTheme.text}40`,
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate(1)}
            disabled={activeIdx === sortedTurns.length - 1 || animating}
            aria-label="Next turn"
            className="cursor-pointer w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              backgroundColor: activeTheme.text,
              boxShadow: `0 4px 14px ${activeTheme.text}50`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Expand modal */}
      {expanded && activeTurn && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-[760px] w-full max-h-[88vh] flex flex-col"
            style={{ boxShadow: `0 20px 60px ${activeTheme.text}50, 0 0 0 2px ${activeTheme.text}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-200">
              <p
                className="font-headline text-[11px] font-bold tracking-[0.2em] uppercase"
                style={{ color: activeTheme.text }}
              >
                {sideName(activeSide, activeSideIdx)}
                <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                  Turn {activeIdx + 1} of {sortedTurns.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="cursor-pointer text-caption hover:text-ink transition-colors p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 font-body text-[16px] sm:text-[17px] leading-[1.7] whitespace-pre-wrap text-ink">
              {activeTurn.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
