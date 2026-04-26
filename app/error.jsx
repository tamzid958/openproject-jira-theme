"use client";

import { useEffect } from "react";
import { CenterStatus } from "@/components/ui/center-status";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (typeof console !== "undefined") console.error(error);
  }, [error]);
  return (
    <CenterStatus>
      <h2 className="font-display font-bold text-[18px] text-fg m-0 mb-2">
        Something went wrong
      </h2>
      <p className="text-fg-muted m-0 mb-3 text-[13px]">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600"
      >
        Try again
      </button>
    </CenterStatus>
  );
}
