"use client";

import { cn } from "@/lib/utils";

// Tiny tracked uppercase label that sits above section titles, hero
// metadata, and pulse-cell stat names. The visual rhythm of the platinum
// design language depends on these reading as "tiny architectural type"
// rather than ordinary helper copy — that's why it lives as its own
// primitive instead of inline classes.
//
//   <Eyebrow>Sprint 14 · Day 6 of 10</Eyebrow>
//
// Pass `tone="strong"` to lift the color one tier (use for the active
// section); `as="div"` swaps the element when nesting under a heading.
export function Eyebrow({ tone = "default", as: Tag = "div", className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "eyebrow",
        tone === "strong" && "text-fg-muted",
        tone === "faint" && "text-fg-faint",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
