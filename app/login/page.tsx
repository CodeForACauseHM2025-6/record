import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-body">
      <div className="w-full max-w-md text-center">
        {/* Masthead */}
        <Link href="/" className="reveal reveal-delay-1 block">
          <h1 className="font-masthead text-[52px] sm:text-[64px] leading-none tracking-tight">
            The Record
          </h1>
        </Link>

        <p className="reveal reveal-delay-1 text-[13px] tracking-[0.08em] mt-1 text-caption">
          Horace Mann&rsquo;s Weekly Newspaper Since 1903
        </p>

        {/* Ornamental divider */}
        <div className="reveal reveal-delay-2 my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-rule" />
          <span className="text-maroon text-lg select-none" aria-hidden="true">
            &#9830;
          </span>
          <div className="flex-1 h-px bg-rule" />
        </div>

        {/* Sign-in prompt */}
        <p className="reveal reveal-delay-3 font-headline text-xl tracking-wide mb-8">
          Sign in to continue
        </p>

        {/* Error message */}
        {errorMessage && (
          <div className="reveal mb-6 border border-maroon/30 bg-maroon/5 px-4 py-3 text-[14px] text-maroon">
            {errorMessage}
          </div>
        )}

        {/* Google sign-in button */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: safeCallbackUrl });
          }}
        >
          <button
            type="submit"
            className="reveal reveal-delay-4 group w-full flex items-center justify-center gap-3 border border-ink/20 px-6 py-3.5 font-headline text-[16px] tracking-wide transition-all duration-200 hover:border-maroon hover:text-maroon hover:shadow-[0_2px_8px_rgba(139,26,26,0.1)] active:scale-[0.99]"
          >
            {/* Google "G" icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Email requirement note */}
        <p className="reveal reveal-delay-5 mt-6 text-[13px] text-caption tracking-wide">
          Requires a <span className="font-semibold">@horacemann.org</span>{" "}
          email address
        </p>

        {/* Back to homepage */}
        <Link
          href="/"
          className="reveal reveal-delay-5 inline-block mt-10 font-headline text-[14px] tracking-wide text-ink/50 hover:text-maroon transition-colors"
        >
          &larr; Return to The Record
        </Link>
      </div>
    </div>
  );
}
