"use client";

import { useState, useEffect } from "react";
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
  {
    name: "maroon",
    text: "#8B1A1A",
    bg: "rgba(139, 26, 26, 0.06)",
    bgStrong: "rgba(139, 26, 26, 0.12)",
    border: "#8B1A1A",
  },
  {
    name: "teal",
    text: "#1F4E79",
    bg: "rgba(31, 78, 121, 0.06)",
    bgStrong: "rgba(31, 78, 121, 0.12)",
    border: "#1F4E79",
  },
];

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

  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [direction, setDirection] = useState<1 | -1>(1);

  function go(delta: 1 | -1) {
    if (phase !== "idle") return;
    const next = activeIdx + delta;
    if (next < 0 || next >= sortedTurns.length) return;
    setDirection(delta);
    setPhase("leaving");
    setTimeout(() => {
      setActiveIdx(next);
      setPhase("entering");
      requestAnimationFrame(() => {
        setTimeout(() => setPhase("idle"), 50);
      });
    }, 320);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, phase]);

  const activeTurn = sortedTurns[activeIdx];
  const activeSideIdx = activeTurn ? sideIndexById[activeTurn.sideId] ?? 0 : 0;
  const activeSide = activeTurn ? sideById[activeTurn.sideId] : undefined;
  const activeTheme = SIDE_THEMES[activeSideIdx] ?? SIDE_THEMES[0];

  // Animation transforms
  const cardTransform =
    phase === "leaving"
      ? `translateX(${direction * 60}px) rotate(${direction * 6}deg)`
      : phase === "entering"
      ? `translateX(${-direction * 60}px) rotate(${-direction * 6}deg)`
      : "translateX(0) rotate(0deg)";
  const cardOpacity = phase === "idle" ? 1 : 0;

  return (
    <article>
      {/* Header / prompt */}
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
        <h1 className="mt-5 font-headline text-[28px] sm:text-[40px] lg:text-[46px] font-bold leading-[1.15]">
          {data.prompt || "—"}
        </h1>
        <div className="mt-6 mx-auto flex items-center justify-center gap-2">
          <span
            className="h-[3px] w-10 rounded"
            style={{ backgroundColor: SIDE_THEMES[0].text }}
          />
          <span className="font-headline text-[10px] font-semibold tracking-[0.2em] uppercase text-caption">
            vs
          </span>
          <span
            className="h-[3px] w-10 rounded"
            style={{ backgroundColor: SIDE_THEMES[1].text }}
          />
        </div>
      </header>

      {/* Round table */}
      {sortedTurns.length > 0 ? (
        <div className="mt-12 mx-auto max-w-[860px]">
          <div className="relative aspect-square sm:aspect-[5/4] w-full">
            {/* Outer ring */}
            <div
              className="absolute inset-4 rounded-full transition-colors duration-500"
              style={{
                border: `2px dashed ${activeTheme.border}40`,
                background: `radial-gradient(circle, ${activeTheme.bg} 0%, transparent 70%)`,
              }}
            />

            {/* Side label arcs */}
            {sortedSides.map((side, i) => {
              const theme = SIDE_THEMES[i] ?? SIDE_THEMES[0];
              const isLeft = i === 0;
              return (
                <div
                  key={side.id}
                  className={`absolute top-6 ${isLeft ? "left-6" : "right-6"} font-headline font-bold tracking-[0.18em] uppercase text-[11px] sm:text-[13px]`}
                  style={{ color: theme.text }}
                >
                  {sideName(side, i)}
                </div>
              );
            })}

            {/* Author avatars positioned around circle */}
            {sortedSides.map((side, sideIdx) => {
              const theme = SIDE_THEMES[sideIdx] ?? SIDE_THEMES[0];
              const isLeft = sideIdx === 0;
              return side.authors.map((a, j) => {
                const total = side.authors.length;
                // Distribute across a 140° arc on each side
                const arcStart = isLeft ? 110 : -70;
                const arcEnd = isLeft ? 250 : 70;
                const t = total === 1 ? 0.5 : j / (total - 1);
                const angleDeg = arcStart + (arcEnd - arcStart) * t;
                const angleRad = (angleDeg * Math.PI) / 180;
                const radius = 44; // percent
                const x = 50 + radius * Math.cos(angleRad);
                const y = 50 + radius * Math.sin(angleRad);
                const isSpeaking = activeSide?.id === side.id;
                return (
                  <div
                    key={a.user.id}
                    className="absolute transition-all duration-500"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      opacity: isSpeaking ? 1 : 0.35,
                    }}
                  >
                    <div
                      className="flex flex-col items-center gap-1.5 transition-transform duration-500"
                      style={{ transform: isSpeaking ? "scale(1.08)" : "scale(1)" }}
                    >
                      <Avatar user={a.user} size={56} ring={theme.text} />
                      <Link
                        href={`/profile/${a.user.id}`}
                        className="font-headline text-[11px] sm:text-[12px] font-semibold tracking-wide hover:underline whitespace-nowrap"
                        style={{ color: theme.text }}
                      >
                        {a.user.name}
                      </Link>
                    </div>
                  </div>
                );
              });
            })}

            {/* Center turn card */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="pointer-events-auto w-[68%] sm:w-[60%] max-w-[480px] mx-auto"
                style={{
                  transform: cardTransform,
                  opacity: cardOpacity,
                  transition: "transform 320ms cubic-bezier(0.5,0,0.5,1), opacity 320ms ease",
                }}
              >
                <div
                  className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 text-center"
                  style={{
                    backgroundColor: "white",
                    boxShadow: `0 8px 32px ${activeTheme.text}25, 0 0 0 2px ${activeTheme.text}`,
                  }}
                >
                  <p
                    className="font-headline text-[10px] font-bold tracking-[0.2em] uppercase"
                    style={{ color: activeTheme.text }}
                  >
                    {sideName(activeSide, activeSideIdx)}
                    <span className="text-caption font-normal tracking-[0.06em] normal-case ml-2">
                      Turn {activeIdx + 1} of {sortedTurns.length}
                    </span>
                  </p>
                  <p className="mt-3 font-body text-[15px] sm:text-[17px] leading-[1.6] whitespace-pre-wrap text-ink">
                    {activeTurn?.body}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={activeIdx === 0 || phase !== "idle"}
              aria-label="Previous turn"
              className="cursor-pointer w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{
                border: `2px solid ${activeTheme.text}`,
                color: activeTheme.text,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {sortedTurns.map((t, i) => {
                const tIdx = sideIndexById[t.sideId] ?? 0;
                const tTheme = SIDE_THEMES[tIdx] ?? SIDE_THEMES[0];
                const isActive = i === activeIdx;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (phase !== "idle" || i === activeIdx) return;
                      const dir: 1 | -1 = i > activeIdx ? 1 : -1;
                      setDirection(dir);
                      setPhase("leaving");
                      setTimeout(() => {
                        setActiveIdx(i);
                        setPhase("entering");
                        requestAnimationFrame(() => {
                          setTimeout(() => setPhase("idle"), 50);
                        });
                      }, 320);
                    }}
                    aria-label={`Go to turn ${i + 1}`}
                    className="cursor-pointer transition-all rounded-full"
                    style={{
                      width: isActive ? 28 : 8,
                      height: 8,
                      backgroundColor: isActive ? tTheme.text : `${tTheme.text}40`,
                    }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              disabled={activeIdx === sortedTurns.length - 1 || phase !== "idle"}
              aria-label="Next turn"
              className="cursor-pointer w-11 h-11 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
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

          <p className="mt-3 text-center font-headline text-[11px] tracking-wide text-caption">
            Use ← → to navigate
          </p>
        </div>
      ) : (
        <p className="mt-12 text-center font-headline text-[15px] text-caption italic">
          No arguments published yet.
        </p>
      )}
    </article>
  );
}
