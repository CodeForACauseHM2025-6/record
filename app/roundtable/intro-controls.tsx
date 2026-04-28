"use client";

import { useEffect, useState } from "react";
import { ONCE_ONLY_KEY, REPLAY_EVENT } from "@/app/roundtable/round-table-spin-intro";

export function IntroControls() {
  // Default: false (always replay) — flip it on once you're done testing.
  const [onceOnly, setOnceOnly] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setOnceOnly(window.localStorage.getItem(ONCE_ONLY_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggle(next: boolean) {
    setOnceOnly(next);
    try {
      window.localStorage.setItem(ONCE_ONLY_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function replay() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }

  return (
    <section className="mt-8">
      <h3 className="font-headline text-[11px] font-bold tracking-[0.18em] uppercase text-caption">
        Intro Animation
      </h3>
      <div className="mt-3 h-px bg-neutral-200" />

      <label className="mt-3 flex items-center justify-between gap-3 cursor-pointer select-none">
        <span className="font-headline text-[13px]">Show only once per visit</span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={onceOnly}
            onChange={(e) => toggle(e.target.checked)}
            disabled={!hydrated}
          />
          <span
            aria-hidden="true"
            className={`block w-9 h-5 rounded-full transition-colors ${
              onceOnly ? "bg-maroon" : "bg-neutral-300"
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              onceOnly ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </label>
      <p className="mt-2 font-headline text-[11px] text-caption leading-snug">
        {onceOnly
          ? "The intro plays once per round-table edition, then is remembered."
          : "The intro plays every time you open this page."}
      </p>

      <button
        type="button"
        onClick={replay}
        className="mt-3 cursor-pointer w-full font-headline text-[12px] font-bold tracking-[0.06em] uppercase border border-maroon/40 text-maroon px-4 py-2 hover:bg-maroon hover:text-white transition-colors"
      >
        Replay intro now
      </button>
    </section>
  );
}
