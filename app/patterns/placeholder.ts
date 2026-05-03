// Placeholder article shape used by both server-component patterns (when a slot is empty in
// edit mode) and the client-side `editable.tsx` chrome. Lives in its own file with NO
// "use client" directive so server components can call `getPlaceholderArticle()` directly.
// Calling functions exported from a "use client" module from a server component is a Next.js
// build-time error in production.

import type { SlotArticle } from "@/app/patterns/types";

export const PLACEHOLDER_BODY =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export function getPlaceholderArticle(): SlotArticle {
  return {
    id: "placeholder",
    title: "Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing",
    slug: "#",
    body: PLACEHOLDER_BODY,
    section: "NEWS",
    featuredImage: null,
    publishedAt: null,
    createdBy: {
      id: "placeholder",
      name: "Author Name",
      role: "WRITER",
      displayTitle: "Staff Writer",
    },
    credits: [],
  };
}
