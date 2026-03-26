import Link from "next/link";
import { HamburgerButton } from "@/app/sidebar-menu";

export function SubpageHeader({ pageLabel, badge }: { pageLabel: string; badge?: string }) {
  return (
    <header className="border-b border-rule px-4 sm:px-8 py-3">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Left: hamburger + page label */}
        <div className="flex items-center gap-4 font-headline text-base">
          <HamburgerButton />
          <span className="font-semibold tracking-wide text-[15px] sm:text-base">
            {pageLabel}
          </span>
        </div>

        {/* Center: Masthead */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="font-masthead text-[28px] sm:text-[34px] leading-none tracking-tight">
            The Record
          </span>
          {badge && (
            <span className="font-headline text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] uppercase bg-maroon text-white px-2 py-1">
              {badge}
            </span>
          )}
        </Link>

        {/* Right: search */}
        <div className="flex items-center">
          <Link href="/search" aria-label="Search" className="p-1">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line
                x1="16.5" y1="16.5" x2="22" y2="22"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
