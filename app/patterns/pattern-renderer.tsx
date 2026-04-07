import { BlockData, SlotWrapper } from "@/app/patterns/types";
import { HeroPattern } from "@/app/patterns/hero-pattern";
import { FourGridPattern } from "@/app/patterns/four-grid-pattern";
import { TextImagesPattern } from "@/app/patterns/text-images-pattern";
import { HeadlineStackPattern } from "@/app/patterns/headline-stack-pattern";
import { TwoThumbnailsPattern } from "@/app/patterns/two-thumbnails-pattern";
import { SingleFeaturePattern } from "@/app/patterns/single-feature-pattern";
import { SbFeaturePattern } from "@/app/patterns/sb-feature-pattern";
import { SbTwoSmallPattern } from "@/app/patterns/sb-two-small-pattern";
import { SbHeadlinesPattern } from "@/app/patterns/sb-headlines-pattern";
import { SbThumbnailsPattern } from "@/app/patterns/sb-thumbnails-pattern";

const RENDERERS: Record<string, React.ComponentType<{ slots: BlockData["slots"]; wrapSlot?: SlotWrapper }>> = {
  hero: HeroPattern,
  "four-grid": FourGridPattern,
  "text-images": TextImagesPattern,
  "headline-stack": HeadlineStackPattern,
  "two-thumbnails": TwoThumbnailsPattern,
  "single-feature": SingleFeaturePattern,
  "sb-feature": SbFeaturePattern,
  "sb-two-small": SbTwoSmallPattern,
  "sb-headlines": SbHeadlinesPattern,
  "sb-thumbnails": SbThumbnailsPattern,
};

export function PatternRenderer({ block, wrapSlot }: { block: BlockData; wrapSlot?: SlotWrapper }) {
  const Component = RENDERERS[block.pattern];
  if (!Component) return null;
  return <Component slots={block.slots} wrapSlot={wrapSlot} />;
}
