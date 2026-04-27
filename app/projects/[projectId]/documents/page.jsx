"use client";

import { use } from "react";
import { Documents } from "@/components/documents";
import { useApiStatus, useProjects } from "@/lib/hooks/use-openproject";

export default function DocumentsPage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const projectsQ = useProjects(configured);
  const project = projectsQ.data?.find((p) => p.id === projectId) || null;

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Documents
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        <Documents projectId={projectId} projectName={project?.name} />
      </div>
    </>
  );
}
