import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "WEB_MASTER" && session.user.role !== "WEB_TEAM") redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Admin" badge="Admin" />

      {/* Admin secondary nav */}
      <nav className="border-b border-rule">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-3 flex gap-6 font-headline text-[14px] tracking-wide overflow-x-auto">
          <AdminTab href="/admin" label="Overview" />
          <AdminTab href="/admin/users" label="Users" />
          <AdminTab href="/admin/settings" label="Settings" />
        </div>
      </nav>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 pt-8 pb-16">
        {children}
      </main>

      <Footer />
    </div>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="font-semibold text-caption hover:text-maroon transition-colors whitespace-nowrap"
    >
      {label}
    </Link>
  );
}
