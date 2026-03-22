"use client";

import { useState } from "react";
import Link from "next/link";

const SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinion", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Account", href: "/account" },
];

export function HamburgerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open menu"
        className="p-1 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <svg
          width="22"
          height="16"
          viewBox="0 0 22 16"
          fill="none"
          aria-hidden="true"
        >
          <line y1="1" x2="22" y2="1" stroke="currentColor" strokeWidth="2" />
          <line y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2" />
          <line y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <nav
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <span className="font-masthead text-[24px] leading-none">
            The Record
          </span>
          <button
            aria-label="Close menu"
            className="p-1 hover:text-maroon transition-colors"
            onClick={() => setOpen(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="px-6 pt-6">
          <p className="text-[11px] tracking-[0.12em] uppercase text-caption font-headline font-semibold mb-3">
            Sections
          </p>
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 font-headline text-[18px] tracking-wide hover:text-maroon transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>

        <div className="mx-6 my-5 h-px bg-ink/10" />

        {/* Pages */}
        <div className="px-6">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 font-headline text-[16px] tracking-wide text-caption hover:text-maroon transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
