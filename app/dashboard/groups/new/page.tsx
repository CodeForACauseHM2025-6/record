import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubpageHeader } from "@/app/subpage-header";
import { createGroupWithArticles } from "@/app/dashboard/group-actions";

export default async function NewGroupPage() {
  const session = await auth();
  const EDITOR_ROLES = ["EDITOR", "WEB_TEAM", "WEB_MASTER"];
  if (!session?.user || !EDITOR_ROLES.includes(session.user.role ?? "")) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="New Group" />

      <div className="max-w-[900px] mx-auto px-4 sm:px-8 pt-8 pb-16">
        <h2 className="font-headline text-[28px] sm:text-[34px] font-bold tracking-wide">
          Create Edition
        </h2>
        <p className="font-headline text-[13px] text-caption mt-1 tracking-wide">
          Name the edition, then create articles and build the layout.
        </p>
        <div className="mt-4 h-[2px] bg-rule" />

        <form action={createGroupWithArticles} className="mt-8 space-y-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-headline text-[12px] font-semibold tracking-[0.06em] uppercase text-caption mb-1">
                Name
              </label>
              <input
                name="name"
                required
                placeholder="e.g. March 31, 2026"
                className="w-full border border-ink/20 px-4 py-2 font-headline text-[16px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
              />
            </div>
            <div className="w-32">
              <label className="block font-headline text-[12px] font-semibold tracking-[0.06em] uppercase text-caption mb-1">
                Issue #
              </label>
              <input
                name="issueNumber"
                placeholder="#"
                className="w-full border border-ink/20 px-3 py-2 font-headline text-[16px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors text-center"
              />
            </div>
          </div>

          <button
            type="submit"
            className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-6 py-2.5 hover:bg-maroon transition-colors"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
}
