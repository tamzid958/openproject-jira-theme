"use client";

import { use } from "react";
import { Members } from "@/components/members";
import { useApiStatus, useProjects } from "@/lib/hooks/use-openproject";

export default function MembersPage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const projectsQ = useProjects(configured);
  const project = projectsQ.data?.find((p) => p.id === projectId) || null;

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg m-0">
          Members
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        <Members projectId={projectId} projectName={project?.name} />
      </div>
    </>
  );
}
