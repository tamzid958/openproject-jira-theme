"use client";

import { useEffect } from "react";
import { CenterError } from "@/components/ui/center-status";

export default function ProjectError({ error, reset }) {
  useEffect(() => {
    if (typeof console !== "undefined") console.error(error);
  }, [error]);
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-xl shadow-md p-7">
        <h2 className="font-display font-bold text-[18px] text-fg m-0 mb-2">
          Couldn&apos;t load this view
        </h2>
        <pre className="bg-surface-subtle border border-border rounded-lg px-3 py-2.5 text-[12.5px] font-mono text-pri-highest whitespace-pre-wrap m-0 mb-3">
          {error?.message || "Unexpected error"}
        </pre>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
