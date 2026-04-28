import { prisma } from "@/lib/prisma";
import { updateVolumeNumber } from "@/app/admin/admin-actions";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  const volSetting = await prisma.siteSetting.findUnique({ where: { key: "volumeNumber" } });
  const volumeNumber = (volSetting as { value?: string } | null)?.value ?? "";

  return (
    <div>
      <h1 className="font-headline text-[30px] sm:text-[36px] font-bold tracking-wide">
        Site Settings
      </h1>
      <div className="mt-2 h-[2px] bg-rule" />

      {saved && (
        <p className="mt-4 font-headline text-[13px] text-maroon">Saved.</p>
      )}

      <section className="mt-10 max-w-[560px]">
        <h2 className="font-headline text-[20px] font-bold tracking-wide">
          Volume Number
        </h2>
        <p className="font-headline text-[13px] text-caption mt-1">
          Default volume for new issues (e.g., 123). Editors can override per issue.
        </p>
        <div className="mt-3 h-px bg-rule" />

        <form action={updateVolumeNumber} className="mt-5 flex flex-wrap items-center gap-3">
          <input
            name="volumeNumber"
            type="number"
            min="1"
            step="1"
            defaultValue={/^[0-9]+$/.test(volumeNumber) ? volumeNumber : ""}
            placeholder="123"
            className="border border-ink/20 px-3 py-2 font-body text-[14px] outline-none focus:border-ink w-full sm:w-[220px] tracking-wider"
          />
          <button
            type="submit"
            className="cursor-pointer font-headline text-[14px] tracking-wide font-bold border border-ink/20 px-5 py-2 hover:border-maroon hover:text-maroon transition-colors"
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
