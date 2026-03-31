import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <div className="flex-1 flex flex-col items-center justify-start pt-[20vh] px-4">
        <div className="text-center max-w-md">
          <p className="font-headline text-[72px] font-bold tracking-wide leading-none">
            404
          </p>
          <h2 className="mt-4 font-headline text-[24px] font-bold tracking-wide">
            Page Not Found
          </h2>
          <p className="mt-3 font-headline text-[16px] text-caption leading-relaxed">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-6 py-2.5 hover:bg-maroon transition-colors"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
