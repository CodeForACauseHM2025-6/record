import { BlockData } from "@/app/patterns/types";
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
import { RoundTablePattern } from "@/app/patterns/round-table-pattern";
import { SbRoundTablePattern } from "@/app/patterns/sb-round-table-pattern";
import { RoundTableFullPattern } from "@/app/patterns/round-table-full-pattern";

const SLOT_RENDERERS: Record<
  string,
  React.ComponentType<{ slots: BlockData["slots"]; editMode?: boolean }>
> = {
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

const ROUND_TABLE_RENDERERS: Record<
  string,
  React.ComponentType<{ roundTable?: BlockData["roundTable"]; editMode?: boolean }>
> = {
  "round-table": RoundTablePattern,
  "sb-round-table": SbRoundTablePattern,
  "round-table-full": RoundTableFullPattern,
};

export function PatternRenderer({
  block,
  editMode = false,
}: {
  block: BlockData;
  editMode?: boolean;
}) {
  const RoundTableComponent = ROUND_TABLE_RENDERERS[block.pattern];
  if (RoundTableComponent) {
    return <RoundTableComponent roundTable={block.roundTable} editMode={editMode} />;
  }

  const SlotComponent = SLOT_RENDERERS[block.pattern];
  if (!SlotComponent) return null;
  return <SlotComponent slots={block.slots} editMode={editMode} />;
}
