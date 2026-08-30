import { SubpageHeader } from "@/app/subpage-header";

export default function JoinPage() {
  const recordLink =
    "https://clubhub.co/dashboard?page=club-page&club=1725636744913x938378244989911000";

  const webDevLink =
    "https://clubhub.co/dashboard?page=club-page&club=1726516586307x812043095463166000";

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <SubpageHeader pageLabel="Join Our Team" />

      <div className="max-w-[700px] mx-auto px-4 sm:px-8 pt-12 pb-16">
        <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          Join Our Team
        </h2>

        <div className="mt-3 h-[2px] bg-rule" />

        <div className="mt-8 flex flex-col gap-4">
          <a
            href={recordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-headline text-[17px] font-bold px-6 py-4 border border-ink hover:bg-ink hover:text-white transition-colors"
          >
            Join The Record
          </a>

          <a
            href={webDevLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-headline text-[17px] font-bold px-6 py-4 border border-ink hover:bg-ink hover:text-white transition-colors"
          >
            Join the Web Development Team
          </a>
        </div>
      </div>
    </div>
  );
}