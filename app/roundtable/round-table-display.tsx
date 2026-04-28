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
  { text: "#8B1A1A", soft: "rgba(139, 26, 26, 0.10)", softer: "rgba(139, 26, 26, 0.04)" },
  { text: "#1F4E79", soft: "rgba(31, 78, 121, 0.10)", softer: "rgba(31, 78, 121, 0.04)" },
];

const ANIM_MS = 800;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

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
  const sideIndexById: Record<string, number> = {};
  sortedSides.forEach((s, i) => {
    sideIndexById[s.id] = i;
  });
  const sortedTurns = [...data.turns].sort((a, b) => a.order - b.order);
  const N = sortedTurns.length;
  const slotAngle = N > 0 ? 360 / N : 0;

  const [activeIdx, setActiveIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // The ring rotates by -activeIdx * slotAngle so the active card sits at angle 0 (top).
  const ringRotation = -activeIdx * slotAngle;

  function navigate(delta: 1 | -1) {
    if (animating) return;
    const next = activeIdx + delta;
    if (next < 0 || next >= N) return;
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
  const activeSide = activeTurn ? sortedSides[activeSideIdx] : undefined;
  const activeTheme = SIDE_THEMES[activeSideIdx] ?? SIDE_THEMES[0];

  // Measure the ring stage so we can size the orbit responsively.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState({ w: 1024, h: 600 });
  useEffect(() => {
    function measure() {
      if (!stageRef.current) return;
      const r = stageRef.current.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  // Ring radius: large enough that the visible top arc fills the stage.
  // Ring diameter ~= 1.7 * stage height. Cards orbit on this radius.
  const radius = Math.max(stage.h * 0.95, 380);
  // Ring center sits below the bottom edge of the stage so we see only the top.
  const centerOffsetBelow = radius - stage.h * 0.78;

  const cardW = Math.min(stage.w * 0.34, 320);
  const cardH = Math.min(stage.h * 0.42, 220);

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
        <h1 className="mt-1.5 font-headline text-[20px] sm:text-[26px] lg:text-[30px] font-bold leading-tight">
          {data.prompt || "—"}
        </h1>
        <div className="mt-2 mx-auto flex items-center justify-center gap-2">
          {sortedSides.map((side, i) => {
            const theme = SIDE_THEMES[i] ?? SIDE_THEMES[0];
            return (
              <div key={side.id} className="flex items-center gap-1.5">
                <span className="h-[3px] w-6 rounded" style={{ backgroundColor: theme.text }} />
                <span
                  className="font-headline text-[10px] font-semibold tracking-[0.16em] uppercase"
                  style={{ color: theme.text }}
                >
                  {sideName(side, i)}
                </span>
                {i === 0 && (
                  <span className="font-headline text-[10px] font-semibold tracking-[0.16em] uppercase text-caption mx-1">
                    vs
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Stage — the visible area where the ring orbits */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 w-full mt-3 relative overflow-hidden"
      >
        {N > 0 && (
          <>
            {/* Table backdrop — big circle whose center is below the stage */}
            <div
              className="absolute pointer-events-none rounded-full transition-colors"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: "50%",
                bottom: -centerOffsetBelow * 2 + radius * 0,
                transform: "translateX(-50%)",
                background: `radial-gradient(circle at 50% calc(100% - ${radius - centerOffsetBelow}px), ${activeTheme.soft} 0%, ${activeTheme.softer} 50%, transparent 75%)`,
                border: `2px dashed ${activeTheme.text}30`,
                top: "auto",
                transitionProperty: "background, border-color",
                transitionDuration: "600ms",
              }}
            />

            {/* Ring container — its origin is at the table center (below stage); rotating it orbits all children. */}
            <div
              className="absolute"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: "50%",
                bottom: -centerOffsetBelow,
                transform: `translateX(-50%) rotate(${ringRotation}deg)`,
                transformOrigin: "50% 50%",
                transition: `transform ${ANIM_MS}ms ${EASE}`,
              }}
            >
              {/* Author avatars positioned around the perimeter — they ROTATE WITH the table */}
              {sortedSides.map((side, sIdx) => {
                const theme = SIDE_THEMES[sIdx] ?? SIDE_THEMES[0];
                // Side 0 occupies one half of the ring, side 1 the other. Place around the visible top.
                const isLeft = sIdx === 0;
                return side.authors.map((a, j) => {
                  const total = side.authors.length;
                  // arc on each side, kept within the visible top arc (-80°..+80°)
                  const arcStart = isLeft ? -80 : 25;
                  const arcEnd = isLeft ? -25 : 80;
                  const t = total === 1 ? 0.5 : j / (total - 1);
                  const aDeg = arcStart + (arcEnd - arcStart) * t;
                  const avatarSize = Math.max(40, Math.min(56, stage.h * 0.085));
                  return (
                    <div
                      key={a.user.id}
                      className="absolute"
                      style={{
                        left: "50%",
                        top: "50%",
                        // Place at radius*0.94 from ring center, at angle aDeg
                        transform: `rotate(${aDeg}deg) translateY(-${radius * 0.92}px) rotate(${-aDeg - ringRotation}deg)`,
                        transformOrigin: "0 0",
                        transition: `transform ${ANIM_MS}ms ${EASE}`,
                      }}
                    >
                      <div
                        className="flex flex-col items-center gap-1"
                        style={{ transform: "translate(-50%, -50%)" }}
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

              {/* Turn cards arranged around the ring at base angles */}
              {sortedTurns.map((turn, i) => {
                const sIdx = sideIndexById[turn.sideId] ?? 0;
                const theme = SIDE_THEMES[sIdx] ?? SIDE_THEMES[0];
                const baseAngle = i * slotAngle;
                const isActive = i === activeIdx;
                return (
                  <div
                    key={turn.id}
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      // Place at distance (radius * 0.55) from ring center, at angle baseAngle.
                      // Counter-rotate so card content stays upright as the ring spins.
                      transform: `rotate(${baseAngle}deg) translateY(-${radius * 0.55}px) rotate(${-baseAngle - ringRotation}deg)`,
                      transformOrigin: "0 0",
                      transition: `transform ${ANIM_MS}ms ${EASE}`,
                      zIndex: isActive ? 10 : 1,
                    }}
                  >
                    <div
                      className="rounded-2xl bg-white"
                      style={{
                        width: cardW,
                        height: cardH,
                        // Center the card on the orbit point
                        transform: "translate(-50%, -50%)",
                        boxShadow: isActive
                          ? `0 14px 40px ${theme.text}40, 0 0 0 2.5px ${theme.text}`
                          : `0 6px 20px rgba(0,0,0,0.08), 0 0 0 1px ${theme.text}30`,
                        opacity: isActive ? 1 : 0.65,
                        transition: `box-shadow ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ${EASE}`,
                      }}
                    >
                      <div className="h-full flex flex-col px-4 py-3 sm:px-5 sm:py-4">
                        <div className="flex items-center justify-between gap-3 shrink-0">
                          <p
                            className="font-headline text-[10px] font-bold tracking-[0.2em] uppercase"
                            style={{ color: theme.text }}
                          >
                            {sideName(sortedSides[sIdx], sIdx)}
                            <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                              {i + 1}/{N}
                            </span>
                          </p>
                          {isActive && (
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
                          className="mt-2 flex-1 min-h-0 font-body text-[13px] sm:text-[14px] leading-[1.5] whitespace-pre-wrap text-ink overflow-hidden"
                          style={{
                            maskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
                            WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
                          }}
                        >
                          {turn.body}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Speaker spotlight (small "x of N" indicator at the very top, above active card) */}
          </>
        )}

        {N === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="font-headline text-[15px] text-caption italic">
              No arguments published yet.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {N > 0 && (
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
              backgroundColor: "white",
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
            disabled={activeIdx === N - 1 || animating}
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
                  Turn {activeIdx + 1} of {N}
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
