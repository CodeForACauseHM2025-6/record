// Manual mock for isomorphic-dompurify used in Jest tests
// Implements the same sanitization behavior without requiring jsdom,
// avoiding Jest incompatibilities with jsdom's ESM-only dependencies.

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "img",
  "figure", "figcaption", "div", "span",
]);

const ALLOWED_ATTR = new Set([
  "href", "src", "alt", "title", "class", "target", "rel",
]);

const VOID_TAGS = new Set(["br", "img"]);

/**
 * Tokenize HTML string into an array of tokens.
 * Returns objects of type: 'text', 'open', 'close', 'self-close', 'comment', 'doctype'
 */
function tokenize(html) {
  const tokens = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) {
        tokens.push({ type: "text", value: html.slice(i) });
        break;
      }
      const tag = html.slice(i + 1, end);
      if (tag.startsWith("!--")) {
        tokens.push({ type: "comment" });
        i = end + 1;
        continue;
      }
      if (tag.startsWith("!")) {
        tokens.push({ type: "doctype" });
        i = end + 1;
        continue;
      }
      if (tag.startsWith("/")) {
        const name = tag.slice(1).trim().toLowerCase().split(/[\s>]/)[0];
        tokens.push({ type: "close", name });
      } else if (tag.endsWith("/")) {
        const rest = tag.slice(0, -1).trim();
        const nameMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
        const name = nameMatch ? nameMatch[1].toLowerCase() : "";
        const attrs = parseAttrs(rest.slice(name.length));
        tokens.push({ type: "self-close", name, attrs });
      } else {
        const nameMatch = tag.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
        const name = nameMatch ? nameMatch[1].toLowerCase() : "";
        const attrs = parseAttrs(tag.slice(name.length));
        tokens.push({ type: "open", name, attrs });
      }
      i = end + 1;
    } else {
      const next = html.indexOf("<", i);
      if (next === -1) {
        tokens.push({ type: "text", value: html.slice(i) });
        break;
      }
      tokens.push({ type: "text", value: html.slice(i, next) });
      i = next;
    }
  }
  return tokens;
}

function parseAttrs(str) {
  const attrs = {};
  const re = /([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))|(?=[>\s\/]|$))/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "";
    attrs[name] = value;
  }
  return attrs;
}

function sanitize(dirty, options) {
  if (!dirty) return "";

  const allowedTags = options && options.ALLOWED_TAGS
    ? new Set(options.ALLOWED_TAGS.map(t => t.toLowerCase()))
    : ALLOWED_TAGS;
  const allowedAttr = options && options.ALLOWED_ATTR
    ? new Set(options.ALLOWED_ATTR.map(a => a.toLowerCase()))
    : ALLOWED_ATTR;

  const tokens = tokenize(dirty);
  let result = "";
  // Track open tags to close them properly (skip unallowed tags' content for script/style)
  const skipStack = [];

  for (const token of tokens) {
    if (skipStack.length > 0) {
      if (token.type === "close" && token.name === skipStack[skipStack.length - 1]) {
        skipStack.pop();
      }
      continue;
    }

    if (token.type === "text") {
      result += token.value;
    } else if (token.type === "open") {
      if (!allowedTags.has(token.name)) {
        // Skip content of script/style/etc
        if (!VOID_TAGS.has(token.name)) {
          skipStack.push(token.name);
        }
        continue;
      }
      // Filter attributes - strip event handlers and non-allowed attrs
      const filteredAttrs = Object.entries(token.attrs)
        .filter(([k]) => allowedAttr.has(k) && !k.startsWith("on"))
        .map(([k, v]) => `${k}="${v}"`);
      result += `<${token.name}${filteredAttrs.length ? " " + filteredAttrs.join(" ") : ""}>`;
    } else if (token.type === "close") {
      if (!allowedTags.has(token.name)) continue;
      result += `</${token.name}>`;
    } else if (token.type === "self-close") {
      if (!allowedTags.has(token.name)) continue;
      const filteredAttrs = Object.entries(token.attrs)
        .filter(([k]) => allowedAttr.has(k) && !k.startsWith("on"))
        .map(([k, v]) => `${k}="${v}"`);
      result += `<${token.name}${filteredAttrs.length ? " " + filteredAttrs.join(" ") : ""}/>`;
    }
    // comments and doctypes are dropped
  }

  return result;
}

const DOMPurify = {
  sanitize,
  default: null,
};
DOMPurify.default = DOMPurify;

module.exports = DOMPurify;
module.exports.default = DOMPurify;
module.exports.sanitize = sanitize;
