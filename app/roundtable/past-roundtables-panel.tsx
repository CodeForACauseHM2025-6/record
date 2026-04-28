"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IntroControls } from "@/app/roundtable/intro-controls";

interface SidebarRoundTable {
  id: string;
  slug: string;
  prompt: string;
  group: { publishedAt: Date | string | null } | null;
  sides: {
    label: string;
    order: number;
    authors: { user: { id: string; name: string; image: string | null } }[];
  }[];
}

const SIDE_THEMES = [{ text: "#8B1A1A" }, { text: "#1A1A1A" }];

function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function PastRoundTablesPanel({
  items,
  currentSlug,
}: {
  items: SidebarRoundTable[];
  currentSlug?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="cursor-pointer inline-flex items-center gap-2 font-headline text-[12px] font-bold tracking-[0.12em] uppercase border border-maroon/40 text-maroon px-4 py-2 hover:bg-maroon hover:text-white transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Past Round Tables
      {items.length > 0 && (
        <span className="font-headline text-[11px] font-semibold tracking-normal text-caption normal-case">
          ({items.length})
        </span>
      )}
    </button>
  );

  const drawer = mounted && open
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed top-0 right-0 z-[56] h-[100dvh] w-[min(420px,92vw)] bg-white shadow-2xl flex flex-col"
            style={{ animation: "rt-drawer-in 320ms cubic-bezier(0.32,0,0.2,1) both" }}
            role="dialog"
            aria-label="Past Round Tables"
          >
            <style>{`@keyframes rt-drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200 shrink-0">
              <h2 className="font-headline text-[14px] font-bold tracking-[0.14em] uppercase text-maroon">
                Round Tables
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer text-caption hover:text-maroon transition-colors p-1 -mr-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {items.length > 0 ? (
                <>
                  <p className="font-headline text-[11px] font-bold tracking-[0.18em] uppercase text-caption mb-3">
                    Past Editions
                  </p>
                  <ul className="space-y-3">
                    {items.map((rt) => {
                      const isCurrent = rt.slug === currentSlug;
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
                            onClick={() => setOpen(false)}
                            className={`block group rounded-sm border px-4 py-3.5 transition-all ${
                              isCurrent
                                ? "border-maroon bg-maroon/5"
                                : "border-neutral-200 hover:border-maroon/40 hover:bg-maroon/[0.02]"
                            }`}
                          >
                            <p className="font-headline text-[14px] font-bold leading-snug group-hover:text-maroon transition-colors line-clamp-2">
                              {rt.prompt || "Untitled"}
                            </p>
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
                </>
              ) : (
                <p className="font-headline text-[13px] text-caption italic">
                  No past round tables yet.
                </p>
              )}

              <IntroControls />
            </div>
          </aside>
        </>,
        document.body,
      )
    : null;

  return (
    <>
      {trigger}
      {drawer}
    </>
  );
}
