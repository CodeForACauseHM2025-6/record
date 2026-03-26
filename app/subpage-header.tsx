import Link from "next/link";
import { HamburgerButton } from "@/app/sidebar-menu";
import { AccountDropdown } from "@/app/account-dropdown";
import { auth } from "@/lib/auth";

export async function SubpageHeader({ pageLabel, badge }: { pageLabel: string; badge?: string }) {
  const session = await auth();

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
            <span className="font-headline text-[12px] sm:text-[13px] font-bold tracking-[0.08em] uppercase bg-maroon text-white px-2.5 py-1 -translate-y-0.5">
              {badge}
            </span>
          )}
        </Link>

        {/* Right: account + search */}
        <div className="flex items-center gap-4 font-headline text-base">
          {session?.user && (
            <div className="hidden md:block">
              <AccountDropdown
                userName={session.user.name}
                userEmail={session.user.email}
                userImage={session.user.image}
                userRole={session.user.role ?? "READER"}
              />
            </div>
          )}
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
