export function sanitizeHtml(dirty: string): string {
  // `>?` makes the closing bracket optional so unterminated tags (e.g. `<img src=x onerror=alert(1)`
  // at the end of input) are stripped instead of surviving the regex.
  return dirty.replace(/<[^>]*>?/g, "").trim();
}
