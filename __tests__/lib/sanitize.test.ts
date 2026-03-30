import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips all HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe("Hello world");
  });

  it("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("Helloalert(\"xss\")");
  });

  it("strips event handlers", () => {
    const input = '<p onclick="alert(1)">Hello</p>';
    expect(sanitizeHtml(input)).toBe("Hello");
  });
});
