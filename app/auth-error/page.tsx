import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const messages: Record<string, { title: string; description: string }> = {
    AccessDenied: {
      title: "Access Denied",
      description: "Only @horacemann.org accounts can sign in to The Record.",
    },
    Configuration: {
      title: "Server Error",
      description: "There is a problem with the server configuration. Please contact the Web Master.",
    },
    Verification: {
      title: "Verification Error",
      description: "The verification link may have expired or already been used.",
    },
  };

  const { title, description } = messages[error ?? ""] ?? {
    title: "Authentication Error",
    description: "Something went wrong while signing in. Please try again.",
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <div className="flex-1 flex flex-col items-center justify-start pt-[20vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="font-headline text-[28px] font-bold tracking-wide">
            {title}
          </h2>
          <p className="mt-3 font-headline text-[16px] text-caption leading-relaxed">
            {description}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-6 py-2.5 hover:bg-maroon transition-colors"
            >
              Try Again
            </Link>
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
