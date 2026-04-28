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

function SidePanel({ side, idx }: { side: SideData; idx: number }) {
  const theme = SIDE_THEMES[idx] ?? SIDE_THEMES[0];
  return (
    <div
      className="rounded-xl px-4 py-3 sm:px-5 sm:py-3.5"
      style={{
        backgroundColor: theme.softer,
        boxShadow: `inset 0 0 0 1px ${theme.text}25`,
      }}
    >
      <p
        className="font-headline text-[11px] font-bold tracking-[0.18em] uppercase"
        style={{ color: theme.text }}
      >
        {sideName(side, idx)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {side.authors.length === 0 ? (
          <span className="font-headline text-[12px] italic text-caption">No authors</span>
        ) : (
          side.authors.map((a) => (
            <Link
              key={a.user.id}
              href={`/profile/${a.user.id}`}
              className="flex items-center gap-2 group"
            >
              <Avatar user={a.user} size={32} ring={theme.text} />
              <span
                className="font-headline text-[13px] sm:text-[14px] font-semibold tracking-wide group-hover:underline"
                style={{ color: theme.text }}
              >
                {a.user.name}
              </span>
            </Link>
          ))
        )}
      </div>
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

  // The table is a giant disc whose CENTER sits near the bottom of the stage.
  // We see the top arc rising up from the bottom; the rest of the disc extends below.
  const radius = Math.max(stage.h * 1.0, 440);
  // Vertical position (from stage top) of the table's center — just inside the bottom.
  const tableCenterFromTop = stage.h * 0.95;
  // Cards orbit on a smaller circle inside the disc.
  const orbit = Math.min(stage.h * 0.55, stage.w * 0.42);

  const activeW = Math.min(stage.w * 0.55, 520);
  const activeH = Math.min(stage.h * 0.55, 360);
  const inactiveW = Math.min(stage.w * 0.20, 200);
  const inactiveH = Math.min(stage.h * 0.24, 140);

  return (
    <div className="h-full w-full flex flex-col px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-4">
      {/* Header */}
      <header className="max-w-[960px] mx-auto w-full shrink-0">
        <p
          className="text-center font-headline text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: SIDE_THEMES[0].text }}
        >
          The Round Table
          {data.publishedAt && (
            <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
              · {formatDateLong(data.publishedAt)}
            </span>
          )}
        </p>
        <h1 className="mt-1.5 text-center font-headline text-[20px] sm:text-[26px] lg:text-[30px] font-bold leading-tight">
          {data.prompt || "—"}
        </h1>

        {/* Sides + authors */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedSides.map((side, i) => (
            <SidePanel key={side.id} side={side} idx={i} />
          ))}
        </div>
      </header>

      {/* Stage */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 w-full mt-3 relative overflow-hidden"
      >
        {N > 0 && (
          <>
            {/* Table backdrop — its CENTER is positioned at tableCenterFromTop (below the stage). */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: "50%",
                top: tableCenterFromTop,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, ${activeTheme.soft} 0%, ${activeTheme.softer} 55%, transparent 78%)`,
                border: `2px dashed ${activeTheme.text}30`,
                transition: "background 600ms ease, border-color 600ms ease",
              }}
            />

            {/* Ring — same center; rotates as a unit. */}
            <div
              className="absolute"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: "50%",
                top: tableCenterFromTop,
                transform: `translate(-50%, -50%) rotate(${ringRotation}deg)`,
                transformOrigin: "50% 50%",
                transition: `transform ${ANIM_MS}ms ${EASE}`,
              }}
            >
              {sortedTurns.map((turn, i) => {
                const sIdx = sideIndexById[turn.sideId] ?? 0;
                const theme = SIDE_THEMES[sIdx] ?? SIDE_THEMES[0];
                const baseAngle = i * slotAngle;
                const isActive = i === activeIdx;
                const w = isActive ? activeW : inactiveW;
                const h = isActive ? activeH : inactiveH;
                const orbitOffset = orbit;

                return (
                  <div
                    key={turn.id}
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `rotate(${baseAngle}deg) translateY(-${orbitOffset}px) rotate(${-baseAngle - ringRotation}deg)`,
                      transformOrigin: "0 0",
                      transition: `transform ${ANIM_MS}ms ${EASE}`,
                      zIndex: isActive ? 10 : 1,
                    }}
                  >
                    <div
                      className="rounded-2xl bg-white"
                      style={{
                        width: w,
                        height: h,
                        transform: "translate(-50%, -50%)",
                        boxShadow: isActive
                          ? `0 18px 48px ${theme.text}45, 0 0 0 3px ${theme.text}`
                          : `0 6px 20px rgba(0,0,0,0.08), 0 0 0 1px ${theme.text}30`,
                        opacity: isActive ? 1 : 0.7,
                        transition: `box-shadow ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ${EASE}, width ${ANIM_MS}ms ${EASE}, height ${ANIM_MS}ms ${EASE}`,
                      }}
                    >
                      <div className={`h-full flex flex-col ${isActive ? "px-6 py-5 sm:px-8 sm:py-6" : "px-4 py-3"}`}>
                        <div className="flex items-center justify-between gap-3 shrink-0">
                          <p
                            className={`font-headline font-bold tracking-[0.2em] uppercase ${isActive ? "text-[12px] sm:text-[13px]" : "text-[10px]"}`}
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
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div
                          className={`mt-3 flex-1 min-h-0 font-body whitespace-pre-wrap text-ink overflow-hidden ${isActive ? "text-[15px] sm:text-[17px] leading-[1.65]" : "text-[12px] leading-[1.45]"}`}
                          style={{
                            maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                            WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
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
