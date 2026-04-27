"use client";

import { useEffect } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function ProjectError({ error, reset }) {
  useEffect(() => {
    if (typeof console !== "undefined") console.error(error);
  }, [error]);
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="luxe-card max-w-md w-full p-7 sm:p-8">
        <Eyebrow tone="strong">Error</Eyebrow>
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.022em] text-fg m-0 mt-2 mb-3">
          Couldn&apos;t load this view
        </h2>
        <pre className="bg-surface-subtle border border-border-soft rounded-md px-3 py-2.5 text-[12.5px] font-mono text-pri-highest whitespace-pre-wrap m-0 mb-5 overflow-auto">
          {error?.message || "Unexpected error"}
        </pre>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-on-accent text-[13px] font-semibold transition-transform hover:-translate-y-px hover:bg-accent-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
