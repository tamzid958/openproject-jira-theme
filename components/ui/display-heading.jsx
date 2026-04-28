"use client";

import { cn } from "@/lib/utils";

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
        "font-display font-semibold tracking-[-0.022em] leading-[1.05] text-fg m-0",
        SIZE[size] || SIZE.lg,
        italic && "italic",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
