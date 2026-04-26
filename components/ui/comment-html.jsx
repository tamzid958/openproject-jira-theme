"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import parse, { domToReact } from "html-react-parser";

// OP comments arrive as a fragment of CKEditor-flavoured HTML. We sanitise
// (DOMPurify) before parsing so any stray script/style/link/event-handler
// that snuck through the upstream API is dropped, then map a few tags to
// purpose-built React nodes — most importantly `<mention>` which OP marks
// up like `<mention class="mention" data-id="144" data-type="user"
// data-text="@Name">@Name</mention>`. We render that as a styled pill
// rather than letting it land as a no-op tag the browser doesn't know.

const PURIFY_CONFIG = {
  // Allow `<mention>` so we can transform it; everything else falls back
  // to DOMPurify's defaults (no scripts, no event handlers, no javascript:
  // hrefs, no <iframe>, etc.).
  ADD_TAGS: ["mention"],
  ADD_ATTR: ["data-id", "data-type", "data-text", "target", "rel"],
};

function Mention({ id, type, label }) {
  const t = type || "user";
  const text = label || "@mention";
  return (
    <span
      data-mention-id={id}
      data-mention-type={t}
      title={`${t}: ${text}`}
      className="inline-flex items-center px-1.5 py-0 rounded-md bg-accent-50 text-accent-700 font-medium text-[12.5px] leading-[1.6] mx-0.5"
    >
      {text}
    </span>
  );
}

const replace = (node) => {
  if (node.type !== "tag") return undefined;
  if (node.name === "mention") {
    const id = node.attribs?.["data-id"];
    const type = node.attribs?.["data-type"];
    const text =
      node.attribs?.["data-text"] ||
      (node.children?.[0]?.type === "text" ? node.children[0].data : null);
    return <Mention id={id} type={type} label={text} />;
  }
  // Open external links in a new tab so clicking a comment URL doesn't
  // navigate away from the issue. Internal-relative links are left alone.
  if (node.name === "a" && node.attribs?.href) {
    const href = node.attribs.href;
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={node.attribs.class}
        >
          {domToReact(node.children, { replace })}
        </a>
      );
    }
  }
  return undefined;
};

export function CommentHtml({ html, className }) {
  const tree = useMemo(() => {
    if (!html) return null;
    const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
    return parse(clean, { replace });
  }, [html]);
  if (!tree) return null;
  return <div className={className}>{tree}</div>;
}
