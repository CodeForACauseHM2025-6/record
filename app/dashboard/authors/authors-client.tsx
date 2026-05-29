"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDirectoryAuthor, removeDirectoryAuthor } from "@/app/dashboard/author-actions";

type PlaceholderAuthor = { id: string; name: string };

export function AuthorsClient({ initialAuthors }: { initialAuthors: PlaceholderAuthor[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ email: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/directory/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Directory lookup failed");
        return;
      }
      const data = await res.json();
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError("No directory matches");
    } catch {
      setError("Directory lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function add(email: string) {
    setLoading(true);
    setError(null);
    try {
      await addDirectoryAuthor(email);
      setQuery("");
      setResults([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add author");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await removeDirectoryAuthor(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove author");
    }
  }

  return (
    <div className="mt-6">
      {/* Search + add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Search the HM directory by name or email…"
          className="flex-1 border border-ink/20 px-4 py-2.5 font-headline text-[15px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || query.trim().length === 0}
          className="cursor-pointer font-headline font-bold text-[14px] tracking-wide bg-ink text-white px-5 py-2 hover:bg-maroon transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p className="mt-3 font-headline text-[13px] text-maroon">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 border border-ink/15 divide-y divide-neutral-100">
          {results.map((r) => (
            <div key={r.email} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <span className="font-headline font-semibold text-[15px]">{r.name}</span>
                <span className="ml-2 text-[12px] text-caption/60">{r.email}</span>
              </div>
              <button
                type="button"
                onClick={() => add(r.email)}
                className="cursor-pointer font-headline text-[13px] tracking-wide text-maroon hover:underline"
              >
                Add as author
              </button>
            </div>
          ))}
        </div>
      )}

      {/* People added from the directory who haven't signed in yet */}
      <h3 className="mt-10 font-headline text-[18px] font-bold tracking-wide">
        Hasn&rsquo;t logged in yet
      </h3>
      <p className="font-headline text-[13px] text-caption mt-1">
        Added from the directory and creditable now. Their account activates automatically the
        first time they sign in, and everything credited to them carries over.
      </p>

      {initialAuthors.length === 0 ? (
        <p className="mt-4 font-headline italic text-[15px] text-caption/60">
          No one here yet.
        </p>
      ) : (
        <div className="mt-4 border border-ink/15 divide-y divide-neutral-100">
          {initialAuthors.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-headline font-semibold text-[15px] tracking-wide">
                {a.name}
                <span className="ml-3 font-body not-italic text-[11px] font-semibold tracking-[0.08em] uppercase border border-ink/30 text-caption px-1.5 py-0.5">
                  No account yet
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="cursor-pointer font-headline text-[13px] tracking-wide text-caption/50 hover:text-maroon transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
