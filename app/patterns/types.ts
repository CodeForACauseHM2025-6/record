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
}

export interface BlockData {
  id: string;
  pattern: string;
  order: number;
  dividerStyle: string;
  slots: PopulatedSlot[];
}
