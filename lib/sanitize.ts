export function sanitizeHtml(dirty: string): string {
  return dirty.replace(/<[^>]*>/g, "").trim();
}
