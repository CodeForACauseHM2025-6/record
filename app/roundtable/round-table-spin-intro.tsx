"use client";

import { useEffect, useState } from "react";

interface IntroAuthor {
  id: string;
  name: string;
  image: string | null;
  sideIndex: number;
}

const SIDE_THEMES = [
  { text: "#8B1A1A", soft: "rgba(139, 26, 26, 0.18)" },
  { text: "#1F4E79", soft: "rgba(31, 78, 121, 0.18)" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const SEEN_PREFIX = "record:rt-seen:";
export const ONCE_ONLY_KEY = "record:rt-once-only";
export const REPLAY_EVENT = "rt-intro-replay";

// Tri-state helper: read the once-only setting. Defaults to false (always replay)
// so it's easy to QA the animation. Users can flip it on from the sidebar toggle.
function readOnceOnly(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONCE_ONLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function RoundTableSpinIntro({
  slug,
  authors,
  prompt,
}: {
  slug: string;
  authors: IntroAuthor[];
  prompt: string;
}) {
  // Three phases:
  //   "checking"  → SSR + first client render, before we know what localStorage says
  //   "playing"   → animation visible, content under it should still be hidden by parent
  //   "done"      → animation finished or skipped, parent reveals content
  const [phase, setPhase] = useState<"checking" | "playing" | "done">("checking");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seenKey = SEEN_PREFIX + slug;

    function startPlayback() {
      setExiting(false);
      setPhase("playing");
    }

    function shouldPlay(): boolean {
      const onceOnly = readOnceOnly();
      if (!onceOnly) return true;
      try {
        return window.localStorage.getItem(seenKey) !== "1";
      } catch {
        return true;
      }
    }

    if (shouldPlay()) {
      startPlayback();
    } else {
      setPhase("done");
      window.dispatchEvent(new CustomEvent("rt-intro-finished"));
    }

    function onReplay() {
      startPlayback();
    }
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, [slug]);

  // Schedule the exit + finish whenever we (re-)enter the "playing" phase.
  useEffect(() => {
    if (phase !== "playing" || typeof window === "undefined") return;
    const t1 = window.setTimeout(() => setExiting(true), 2400);
    const t2 = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SEEN_PREFIX + slug, "1");
      } catch {
        /* ignore */
      }
      setPhase("done");
      window.dispatchEvent(new CustomEvent("rt-intro-finished"));
    }, 2900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase, slug]);

  function skip() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SEEN_PREFIX + slug, "1");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("rt-intro-finished"));
    }
    setPhase("done");
  }

  if (phase !== "playing") return null;

  // Distribute authors around the rim
  const total = authors.length || 1;
  return (
    <>
      <style>{`
        @keyframes rt-spin {
          0%   { transform: rotateZ(0deg) scale(0.6); opacity: 0; }
          15%  { transform: rotateZ(45deg) scale(1); opacity: 1; }
          70%  { transform: rotateZ(900deg) scale(1); opacity: 1; }
          100% { transform: rotateZ(1080deg) scale(1.04); opacity: 1; }
        }
        @keyframes rt-counter-spin {
          /* Counter-rotate to keep avatar text upright */
          0%   { transform: rotateZ(0deg); }
          15%  { transform: rotateZ(-45deg); }
          70%  { transform: rotateZ(-900deg); }
          100% { transform: rotateZ(-1080deg); }
        }
        @keyframes rt-prompt-fade {
          0%, 60% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes rt-bg-pulse {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 1; }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(139, 26, 26, 0.22) 0%, rgba(31, 78, 121, 0.18) 40%, rgba(0,0,0,0.92) 100%)",
          opacity: exiting ? 0 : 1,
          transition: "opacity 500ms ease",
          animation: "rt-bg-pulse 2400ms cubic-bezier(0.5, 0, 0.5, 1) both",
        }}
      >
        <button
          type="button"
          onClick={skip}
          className="absolute top-6 right-6 cursor-pointer font-headline text-[11px] font-semibold tracking-[0.16em] uppercase text-white/60 hover:text-white transition-colors"
        >
          Skip &rarr;
        </button>

        <div
          className="relative"
          style={{
            width: "min(78vmin, 640px)",
            height: "min(78vmin, 640px)",
            animation: "rt-spin 2400ms cubic-bezier(0.32, 0, 0.2, 1) both",
            transformStyle: "preserve-3d",
          }}
        >
          {/* The table itself */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, transparent 70%), conic-gradient(from 0deg, #8B1A1A 0deg, #1F4E79 180deg, #8B1A1A 360deg)",
              border: "3px solid rgba(255,255,255,0.18)",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.4)",
            }}
          />

          {/* Inner ring / wood-grain effect */}
          <div
            className="absolute rounded-full"
            style={{
              top: "12%",
              left: "12%",
              right: "12%",
              bottom: "12%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}
          />

          {/* Author avatars positioned around the rim — these counter-rotate
              so they stay upright while the table spins. */}
          {authors.map((a, i) => {
            const angleDeg = (360 / total) * i - 90; // start from top, clockwise
            const radius = 47; // % from center
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = 50 + radius * Math.cos(angleRad);
            const y = 50 + radius * Math.sin(angleRad);
            const theme = SIDE_THEMES[a.sideIndex] ?? SIDE_THEMES[0];
            return (
              <div
                key={a.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  animation:
                    "rt-counter-spin 2400ms cubic-bezier(0.32, 0, 0.2, 1) both",
                }}
              >
                <div
                  className="rounded-full overflow-hidden bg-neutral-100"
                  style={{
                    width: 56,
                    height: 56,
                    boxShadow: `0 0 0 3px ${theme.text}, 0 8px 20px rgba(0,0,0,0.35)`,
                  }}
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
                      className="w-full h-full flex items-center justify-center font-headline font-bold text-white text-[18px]"
                      style={{ backgroundColor: theme.text }}
                    >
                      {initials(a.name)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Center wordmark */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              animation:
                "rt-counter-spin 2400ms cubic-bezier(0.32, 0, 0.2, 1) both",
            }}
          >
            <p
              className="font-headline text-white text-[12px] sm:text-[14px] font-bold tracking-[0.32em] uppercase text-center"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            >
              The
              <br />
              Round
              <br />
              Table
            </p>
          </div>
        </div>

        {/* Prompt fades in below */}
        <div
          className="absolute bottom-12 left-0 right-0 text-center px-6"
          style={{
            animation: "rt-prompt-fade 2400ms ease both",
          }}
        >
          <p className="font-headline text-white/80 text-[13px] tracking-[0.18em] uppercase font-semibold mb-2">
            This week’s discussion
          </p>
          <p className="font-headline text-white text-[18px] sm:text-[22px] max-w-[760px] mx-auto leading-snug">
            {prompt || "—"}
          </p>
        </div>
      </div>
    </>
  );
}
