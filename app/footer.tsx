import Link from "next/link";
import { FooterReveal } from "@/app/footer-reveal";

const SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinions", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
  { label: "MD/Alumni", href: "/section/md-alumni" },
];

export function Footer() {
  return (
    <FooterReveal>
      <footer className="border-t border-rule bg-white font-body">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-5">
            {/* Masthead + tagline */}
            <div className="footer-stagger-1">
              <Link href="/">
                <span className="font-masthead text-[24px] leading-none tracking-tight">
                  The Record
                </span>
              </Link>
              <p className="font-body text-[12px] tracking-[0.08em] text-caption mt-0.5">
                Horace Mann&rsquo;s Weekly Newspaper Since 1903
              </p>
            </div>

            {/* Sections */}
            <div className="footer-stagger-2">
              <p className="font-headline text-[11px] font-semibold tracking-[0.1em] uppercase text-caption mb-2">
                Sections
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-1">
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
            <div className="footer-stagger-3">
              <p className="font-headline text-[11px] font-semibold tracking-[0.1em] uppercase text-caption mb-2">
                Links
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-1">
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

          {/* Bottom bar — rule draws across, then content fades in */}
          <div className="mt-5 pt-4 border-t border-ink/10 footer-rule-draw">
            <div className="flex items-center justify-between">
              <p className="font-headline text-[11px] text-caption tracking-wide">
                &copy; {new Date().getFullYear()} The Record, Horace Mann School
              </p>
              <a
                href="https://github.com/CodeForACauseHM2025-6/record"
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption hover:text-maroon transition-colors"
                aria-label="GitHub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </FooterReveal>
  );
}
