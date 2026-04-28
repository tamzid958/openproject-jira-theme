"use client";

import { use } from "react";
import { WikiPageView } from "@/components/wiki-page-view";

export default function WikiPage({ params: paramsPromise }) {
  const { wikiId } = use(paramsPromise);
  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Wiki
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        <WikiPageView id={wikiId} />
      </div>
    </>
  );
}
