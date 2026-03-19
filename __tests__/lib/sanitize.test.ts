import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("allows safe HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  it("strips event handlers", () => {
    const input = '<p onclick="alert(1)">Hello</p>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });
});
