"use client";

interface PatternPreviewProps {
  patternId: string;
}

export function PatternPreview({ patternId }: PatternPreviewProps) {
  const preview = PREVIEWS[patternId];
  if (!preview) return null;
  return preview;
}

// Reusable bits
function PlaceholderImage({ className = "" }: { className?: string }) {
  return <div className={`bg-neutral-300 ${className}`} />;
}

function LoremTitle({ size = "text-[13px]" }: { size?: string }) {
  return <p className={`font-headline ${size} font-bold leading-snug`}>Lorem Ipsum Dolor Sit Amet Consectetur</p>;
}

function LoremExcerpt() {
  return <p className="font-body text-[11px] text-caption leading-relaxed mt-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore...</p>;
}

function LoremByline() {
  return <p className="font-headline text-[10px] mt-1"><span className="text-maroon font-semibold">By Author</span> <span className="italic text-caption">Staff Writer</span></p>;
}

const PREVIEWS: Record<string, React.ReactNode> = {
  // Main patterns
  hero: (
    <div className="flex gap-2" style={{ minHeight: 120 }}>
      <div className="flex-1">
        <LoremTitle size="text-[14px]" />
        <LoremExcerpt />
        <LoremByline />
        <div className="mt-2 border-t border-neutral-200 pt-1">
          <p className="font-headline text-[11px] font-semibold">Second Headline Here</p>
        </div>
        <div className="border-t border-neutral-200 pt-1 mt-1">
          <p className="font-headline text-[11px] font-semibold">Third Headline Here</p>
        </div>
      </div>
      <PlaceholderImage className="flex-[1.2] min-h-[100px]" />
    </div>
  ),
  "four-grid": (
    <div className="grid grid-cols-2 gap-2" style={{ minHeight: 100 }}>
      <div><LoremTitle size="text-[11px]" /><p className="font-headline text-[9px] text-caption mt-0.5">3 MIN READ</p></div>
      <div><LoremTitle size="text-[11px]" /><p className="font-headline text-[9px] text-caption mt-0.5">5 MIN READ</p></div>
      <div className="flex gap-1.5"><PlaceholderImage className="w-[30px] h-[30px] shrink-0" /><div><LoremTitle size="text-[10px]" /></div></div>
      <div className="flex gap-1.5"><PlaceholderImage className="w-[30px] h-[30px] shrink-0" /><div><LoremTitle size="text-[10px]" /></div></div>
    </div>
  ),
  "text-images": (
    <div className="flex gap-2" style={{ minHeight: 100 }}>
      <div className="flex-1">
        <LoremTitle size="text-[12px]" />
        <LoremExcerpt />
        <p className="font-headline text-[9px] text-caption mt-1">4 MIN READ</p>
      </div>
      <PlaceholderImage className="flex-[0.4] min-h-[80px]" />
      <PlaceholderImage className="flex-[0.4] min-h-[80px]" />
    </div>
  ),
  "headline-stack": (
    <div style={{ minHeight: 80 }}>
      <div className="py-1.5 border-b-2 border-ink"><p className="font-headline text-[11px] font-bold">Headline Article One</p></div>
      <div className="py-1.5 border-b-2 border-ink"><p className="font-headline text-[11px] font-bold">Headline Article Two</p></div>
      <div className="py-1.5"><p className="font-headline text-[11px] font-bold">Headline Article Three</p></div>
    </div>
  ),
  "two-thumbnails": (
    <div className="grid grid-cols-2 gap-2" style={{ minHeight: 100 }}>
      <div><PlaceholderImage className="w-full h-[50px] mb-1" /><LoremTitle size="text-[10px]" /><LoremExcerpt /></div>
      <div><PlaceholderImage className="w-full h-[50px] mb-1" /><LoremTitle size="text-[10px]" /><LoremExcerpt /></div>
    </div>
  ),
  "single-feature": (
    <div style={{ minHeight: 100 }}>
      <PlaceholderImage className="w-full h-[60px] mb-2" />
      <LoremTitle size="text-[14px]" />
      <LoremExcerpt />
      <LoremByline />
    </div>
  ),
  // Sidebar patterns
  "sb-feature": (
    <div style={{ minHeight: 90, maxWidth: 160 }}>
      <PlaceholderImage className="w-full h-[50px] mb-1.5" />
      <LoremTitle size="text-[11px]" />
      <LoremExcerpt />
      <LoremByline />
    </div>
  ),
  "sb-two-small": (
    <div className="flex gap-2" style={{ minHeight: 70, maxWidth: 160 }}>
      <div className="flex-1"><PlaceholderImage className="w-full h-[35px] mb-1" /><p className="font-headline text-[9px] font-bold">Article One Title</p></div>
      <div className="flex-1"><PlaceholderImage className="w-full h-[35px] mb-1" /><p className="font-headline text-[9px] font-bold">Article Two Title</p></div>
    </div>
  ),
  "sb-headlines": (
    <div style={{ minHeight: 60, maxWidth: 160 }}>
      <div className="py-1 border-b border-neutral-200"><p className="font-headline text-[10px] font-semibold">Headline one here</p></div>
      <div className="py-1 border-b border-neutral-200"><p className="font-headline text-[10px] font-semibold">Headline two here</p></div>
      <div className="py-1"><p className="font-headline text-[10px] font-semibold">Headline three here</p></div>
    </div>
  ),
  "sb-thumbnails": (
    <div style={{ minHeight: 70, maxWidth: 160 }}>
      <div className="flex gap-1.5 py-1 border-b border-neutral-100"><PlaceholderImage className="w-[25px] h-[25px] shrink-0" /><p className="font-headline text-[9px] font-semibold">Article with thumbnail</p></div>
      <div className="flex gap-1.5 py-1 border-b border-neutral-100"><PlaceholderImage className="w-[25px] h-[25px] shrink-0" /><p className="font-headline text-[9px] font-semibold">Another article here</p></div>
      <div className="flex gap-1.5 py-1"><PlaceholderImage className="w-[25px] h-[25px] shrink-0" /><p className="font-headline text-[9px] font-semibold">Third article title</p></div>
    </div>
  ),
};
