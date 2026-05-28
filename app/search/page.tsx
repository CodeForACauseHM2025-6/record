import { SubpageHeader } from "@/app/subpage-header";
import { Footer } from "@/app/footer";
import { SearchClient } from "@/app/search/search-client";
import { searchAll, type SearchResultItem } from "@/lib/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let initialResults: SearchResultItem[] = [];
  if (query.length > 0) {
    initialResults = await searchAll(query);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body page-enter">
      <SubpageHeader pageLabel="Search" />

      <div className="w-full max-w-[900px] mx-auto px-4 sm:px-8 pt-10 pb-16">
        <h2 className="reveal reveal-delay-1 font-headline text-[28px] sm:text-[36px] font-bold leading-tight tracking-wide">
          Search the Record
        </h2>
        <p className="reveal reveal-delay-1 font-headline text-[14px] text-caption mt-1 tracking-wide">
          Browse every digitized issue of The Record
        </p>

        <SearchClient initialResults={initialResults} initialQuery={query} />
      </div>
      <Footer />
    </div>
  );
}
