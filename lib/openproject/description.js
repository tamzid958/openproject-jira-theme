import "server-only";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// OpenProject's description field is markdown on every modern instance.
// Tiptap emits HTML, so the route handlers feed that HTML through this
// converter before sending it to OP. Without the conversion, OP stores
// the HTML tags as literal markdown text and renders garbage on read-back.

let cachedService = null;

function getService() {
  if (cachedService) return cachedService;
  const svc = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    linkStyle: "inlined",
  });
  svc.use(gfm);
  // Tiptap emits empty paragraphs as "<p></p>" — strip them so empty
  // descriptions round-trip as an empty string instead of stray newlines.
  svc.addRule("emptyParagraph", {
    filter: (node) =>
      node.nodeName === "P" && (node.textContent || "").trim() === "",
    replacement: () => "",
  });
  cachedService = svc;
  return svc;
}

const HTML_HINT = /<\/?[a-z][\s\S]*?>/i;

export function htmlToMarkdown(input) {
  if (input == null) return "";
  const str = String(input);
  if (str.trim() === "") return "";
  // Plain text with no tags: pass through. Saves a turndown roundtrip
  // and avoids escaping characters like `_` or `*` when the user typed
  // them in a plain textarea (create-task path).
  if (!HTML_HINT.test(str)) return str;
  return getService().turndown(str).trim();
}
