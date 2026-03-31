"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-masthead text-[48px] sm:text-[56px] leading-none tracking-tight">
            The Record
          </h1>
          <div className="mt-8 h-[2px] bg-rule" />
          <h2 className="mt-8 font-headline text-[28px] font-bold tracking-wide">
            Something Went Wrong
          </h2>
          <p className="mt-3 font-headline text-[16px] text-caption leading-relaxed">
            An unexpected error occurred. Please try again.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={reset}
              className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-6 py-2.5 hover:bg-maroon transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="font-headline font-bold text-[14px] tracking-wide border border-ink/20 px-6 py-2.5 hover:border-maroon hover:text-maroon transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
