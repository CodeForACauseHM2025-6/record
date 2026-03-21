import Link from "next/link";

export function SubpageHeader({ pageLabel }: { pageLabel: string }) {
  return (
    <header className="border-b border-rule px-4 sm:px-8 py-3">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Left: hamburger + page label */}
        <div className="flex items-center gap-4 font-headline text-base">
          <button aria-label="Toggle sections menu" className="p-1">
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
          <span className="font-semibold tracking-wide text-[15px] sm:text-base">
            {pageLabel}
          </span>
        </div>

        {/* Center: Masthead */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <span className="font-masthead text-[28px] sm:text-[34px] leading-none tracking-tight">
            The Record
          </span>
        </Link>

        {/* Right: search */}
        <div className="flex items-center">
          <button aria-label="Search" className="p-1">
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
          </button>
        </div>
      </div>
    </header>
  );
}
