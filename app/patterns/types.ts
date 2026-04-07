export interface SlotArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  section: string;
  featuredImage: string | null;
  publishedAt: Date | null;
  createdBy: { id: string; name: string; role: string; displayTitle: string | null };
  credits: { creditRole: string; user: { id: string; name: string } }[];
}

export interface PopulatedSlot {
  id: string;
  slotRole: string;
  order: number;
  article: SlotArticle | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaAlt: string | null;
  mediaCredit: string | null;
  scale: string;
  imageScale: string;
  previewLength: number;
  featured: boolean;
  showByline: boolean;
  imageFloat: string;
  imageWidth: number;
  imageCrop: string;
  imageCropCustom: string | null;
}

export interface BlockData {
  id: string;
  pattern: string;
  order: number;
  dividerStyle: string;
  slots: PopulatedSlot[];
}

/** Render prop that wraps each slot's content with editing controls */
export type SlotWrapper = (
  slotIndex: number,
  content: React.ReactNode,
) => React.ReactNode;
