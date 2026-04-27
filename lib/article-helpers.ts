export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function getPreviewText(body: string, maxLen = 200): string {
  const plain = stripHtml(body);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function joinAuthorNames(
  credits: { user: { id: string; name: string } }[],
): string {
  const names = [...new Map(credits.map((c) => [c.user.id, c.user.name])).values()];
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// Returns every credited author, deduped by id, plus the primary role
// (from credits[0]). Falls back to createdBy only when there are no credits.
export function getBylineAuthors(article: {
  credits: { creditRole: string; user: { id: string; name: string } }[];
  createdBy: { id: string; name: string; role: string; displayTitle: string | null };
}): { authors: { id: string; name: string }[]; primaryRole: string | null } {
  if (article.credits.length > 0) {
    const seen = new Set<string>();
    const authors: { id: string; name: string }[] = [];
    for (const c of article.credits) {
      if (seen.has(c.user.id)) continue;
      seen.add(c.user.id);
      authors.push({ id: c.user.id, name: c.user.name });
    }
    const role = article.credits[0].creditRole;
    return { authors, primaryRole: role === "Reader" ? null : role };
  }
  const ROLE_DISPLAY: Record<string, string> = {
    READER: "Reader",
    WRITER: "Staff Writer",
    DESIGNER: "Designer",
    EDITOR: "Editor",
    WEB_TEAM: "Web Team",
    WEB_MASTER: "Web Master",
  };
  const fallback =
    article.createdBy.displayTitle ??
    ROLE_DISPLAY[article.createdBy.role] ??
    article.createdBy.role;
  return {
    authors: [{ id: article.createdBy.id, name: article.createdBy.name }],
    primaryRole: fallback === "Reader" ? null : fallback,
  };
}

const SECTION_LABELS: Record<string, string> = {
  NEWS: "News", FEATURES: "Features", OPINIONS: "Opinions",
  A_AND_E: "A&E", LIONS_DEN: "Lion\u2019s Den", THE_ROUNDTABLE: "The Roundtable",
  MD_ALUMNI: "MD/Alumni",
};

const SECTION_HREFS: Record<string, string> = {
  NEWS: "/section/news", FEATURES: "/section/features", OPINIONS: "/section/opinions",
  A_AND_E: "/section/a-and-e", LIONS_DEN: "/section/lions-den", THE_ROUNDTABLE: "/section/the-roundtable",
  MD_ALUMNI: "/section/md-alumni",
};

export function getSectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}

export function getSectionHref(section: string): string {
  return SECTION_HREFS[section] ?? "#";
}

export function getAuthorInfo(article: {
  credits: { creditRole: string; user: { id: string; name: string } }[];
  createdBy: { id: string; name: string; role: string; displayTitle: string | null };
}): { name: string; role: string | null; id: string } {
  if (article.credits.length > 0) {
    const primary = article.credits[0];
    return { name: primary.user.name, role: hideReader(primary.creditRole), id: primary.user.id };
  }
  const ROLE_DISPLAY: Record<string, string> = {
    READER: "Reader", WRITER: "Staff Writer", DESIGNER: "Designer",
    EDITOR: "Editor", WEB_TEAM: "Web Team", WEB_MASTER: "Web Master",
  };
  return {
    name: article.createdBy.name,
    role: hideReader(article.createdBy.displayTitle ?? ROLE_DISPLAY[article.createdBy.role] ?? article.createdBy.role),
    id: article.createdBy.id,
  };
}

function hideReader(role: string): string | null {
  return role === "Reader" ? null : role;
}
