import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access is restricted to @horacemann.org accounts.",
  OAuthCallbackError: "Something went wrong. Please try again.",
  Default: "An error occurred during sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  if (session?.user) {
    redirect(safeCallbackUrl);
  }

  const errorMessage = error
    ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default
    : null;

  const volSetting = await prisma.siteSetting.findUnique({ where: { key: "volumeNumber" } });
  const volumeNumber = (volSetting as { value?: string } | null)?.value ?? "CXXIII";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="newsprint-grain min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center px-4 font-body warm-fade">
      {/* Decorative corner flourishes — positioned absolutely */}
      <div className="fixed top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-ink/10 reveal reveal-delay-7" />
      <div className="fixed top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-ink/10 reveal reveal-delay-7" />
      <div className="fixed bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-ink/10 reveal reveal-delay-7" />
      <div className="fixed bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-ink/10 reveal reveal-delay-7" />

      <div className="w-full max-w-lg text-center">
        {/* Volume / Date line — classic broadsheet element */}
        <p className="reveal reveal-delay-1 font-headline font-semibold text-[11px] sm:text-[12px] tracking-[0.15em] uppercase text-caption mb-6">
          Vol. {volumeNumber} &middot; {today}
        </p>

        {/* Top double rule */}
        <hr className="reveal reveal-delay-1 rule-double mb-6" />

        {/* Masthead */}
        <Link href="/" className="reveal reveal-delay-2 block">
          <h1 className="font-masthead text-[56px] sm:text-[72px] lg:text-[80px] leading-[0.9] tracking-tight">
            The Record
          </h1>
        </Link>

        <p className="reveal reveal-delay-2 font-headline font-semibold text-[13px] sm:text-[14px] tracking-[0.12em] uppercase mt-2 text-caption">
          Horace Mann&rsquo;s Newspaper Since 1903
        </p>

        {/* Bottom double rule */}
        <hr className="reveal reveal-delay-3 rule-double mt-6" />

        {/* Ornamental divider with flourishes */}
        <div className="reveal reveal-delay-3 my-8 flex items-center gap-3 px-8">
          <div className="flex-1 h-px bg-ink/15" />
          <span className="text-maroon text-[10px] select-none tracking-[0.3em]" aria-hidden="true">
            &#10041; &nbsp; &#9830; &nbsp; &#10041;
          </span>
          <div className="flex-1 h-px bg-ink/15" />
        </div>

        {/* Editorial sign-in card */}
        <div className="reveal reveal-delay-4 editorial-frame bg-white px-8 sm:px-12 py-10 mx-auto max-w-md">
          {/* Card heading */}
          <p className="font-headline font-bold text-[22px] sm:text-[24px] tracking-wide leading-tight">
            Welcome
          </p>
          <p className="font-body font-semibold text-[13px] text-caption mt-2 tracking-wide leading-relaxed">
            Sign in with your Horace Mann Google Account<br />
            to access.
          </p>

          {/* Error message */}
          {errorMessage && (
            <div className="mt-5 border-l-2 border-maroon bg-maroon/5 px-4 py-3 text-left text-[14px] text-maroon">
              {errorMessage}
            </div>
          )}

          {/* Thin rule before button */}
          <div className="my-6 h-px bg-ink/10" />

          {/* Google sign-in button */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: safeCallbackUrl });
            }}
          >
            <button
              type="submit"
              className="stamp-press group w-full flex items-center justify-center gap-3 bg-ink text-white px-6 py-4 font-headline font-bold text-[15px] sm:text-[16px] tracking-[0.06em] transition-all duration-300 hover:bg-maroon hover:shadow-[0_4px_20px_rgba(139,26,26,0.25)]"
            >
              {/* Google "G" icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="opacity-90"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#93b4f5"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#7cc492"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#f0d264"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#e88b8b"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Email requirement note */}
          <p className="mt-5 text-[12px] font-semibold text-caption tracking-[0.04em]">
            Requires an <span className="font-semibold text-ink">@horacemann.org</span> email
          </p>
        </div>

        {/* Pull-quote style motto */}
        <div className="reveal reveal-delay-5 mt-10 px-6">
          <p className="font-headline font-semibold italic text-[16px] sm:text-[18px] text-caption/70 leading-relaxed">
            &ldquo;The duty of a newspaper is to comfort the afflicted<br className="hidden sm:inline" />
            and afflict the comfortable.&rdquo;
          </p>
          <p className="font-headline font-semibold text-[11px] tracking-[0.12em] uppercase text-caption/50 mt-2">
            &mdash; Finley Peter Dunne, 1902
          </p>
        </div>

        {/* Bottom ornament + return link */}
        <div className="reveal reveal-delay-6 mt-8 flex items-center gap-3 px-12">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="text-ink/20 text-xs select-none" aria-hidden="true">&#9830;</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        <Link
          href="/"
          className="reveal reveal-delay-6 inline-block mt-5 mb-4 font-headline font-semibold text-[13px] tracking-[0.06em] text-caption/60 hover:text-maroon transition-colors duration-300"
        >
          &larr; Return to The Record
        </Link>
      </div>
    </div>
  );
}
