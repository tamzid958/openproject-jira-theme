"use client";

import { use } from "react";
import { SavedQueryView } from "@/components/saved-query-view";
import { useApiStatus } from "@/lib/hooks/use-openproject";

export default function SavedQueryPage({ params: paramsPromise }) {
  const { projectId, queryId } = use(paramsPromise);
  const status = useApiStatus();
  const configured = status.data?.configured === true;

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Saved filter
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        {configured ? (
          <SavedQueryView queryId={queryId} projectId={projectId} />
        ) : null}
      </div>
    </>
  );
}
