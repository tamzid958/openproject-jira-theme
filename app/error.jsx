"use client";

import { useEffect } from "react";
import { CenterStatus } from "@/components/ui/center-status";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (typeof console !== "undefined") console.error(error);
  }, [error]);
  return (
    <CenterStatus>
      <Eyebrow tone="strong">Error</Eyebrow>
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.022em] text-fg m-0 mt-2 mb-3">
        Something went wrong
      </h2>
      <p className="text-fg-muted m-0 mb-6 text-[13.5px] leading-relaxed">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-on-accent text-[13px] font-semibold transition-transform hover:-translate-y-px hover:bg-accent-600"
      >
        Try again
      </button>
    </CenterStatus>
  );
}
