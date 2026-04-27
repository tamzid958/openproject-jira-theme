"use client";

import { cn } from "@/lib/utils";

// The "wow" headline. Used sparingly — overview hero, empty states, 404.
// Renders Fraunces (serif) at the requested size with the optical-size
// axis dialed for display use. Default scale is responsive: small on
// phones, dramatic on desktop. Pass an explicit `size` to override.
//
//   <DisplayHeading>Good evening, Tamzid.</DisplayHeading>
//   <DisplayHeading as="h1" size="hero">Nothing here yet.</DisplayHeading>
//
// `italic` swaps in Fraunces' slanted glyphs (it's a different cut, not a
// transform — keep it for one-or-two-word moments, not body copy).
const SIZE = {
  sm: "text-[26px] md:text-[32px]",
  md: "text-[34px] md:text-[44px]",
  lg: "text-[40px] md:text-[56px]",
  hero: "text-[40px] sm:text-[52px] md:text-[68px] lg:text-[80px]",
};

export function DisplayHeading({
  as: Tag = "h1",
  size = "lg",
  italic = false,
  className,
  children,
  ...props
}) {
  return (
    <Tag
      className={cn(
        "display-serif text-fg m-0",
        SIZE[size] || SIZE.lg,
        italic && "italic",
        className,
      )}
      style={{ fontVariationSettings: '"opsz" 144' }}
      {...props}
    >
      {children}
    </Tag>
  );
}
