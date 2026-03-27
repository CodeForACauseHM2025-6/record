import Link from "next/link";

const SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinions", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

export function Footer() {
  return (
    <footer className="border-t border-rule bg-white font-body">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
          {/* Masthead + tagline */}
          <div>
            <Link href="/">
              <span className="font-masthead text-[28px] leading-none tracking-tight">
                The Record
              </span>
            </Link>
            <p className="font-body text-[12px] tracking-[0.08em] text-caption mt-1">
              Horace Mann&rsquo;s Weekly Newspaper Since 1903
            </p>
          </div>

          {/* Sections */}
          <div>
            <p className="font-headline text-[12px] font-semibold tracking-[0.1em] uppercase text-caption mb-3">
              Sections
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {SECTIONS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="font-headline text-[14px] tracking-wide hover:text-maroon transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="font-headline text-[12px] font-semibold tracking-[0.1em] uppercase text-caption mb-3">
              Links
            </p>
            <div className="flex flex-col gap-1.5">
              <Link href="/search" className="font-headline text-[14px] tracking-wide hover:text-maroon transition-colors">
                Search
              </Link>
              <Link href="/account" className="font-headline text-[14px] tracking-wide hover:text-maroon transition-colors">
                Account
              </Link>
              <Link href="/about" className="font-headline text-[14px] tracking-wide hover:text-maroon transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-ink/10 flex items-center justify-between">
          <p className="font-headline text-[12px] text-caption tracking-wide">
            &copy; {new Date().getFullYear()} The Record, Horace Mann School
          </p>
          <a
            href="https://github.com/horacemann/record"
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption hover:text-maroon transition-colors"
            aria-label="GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
