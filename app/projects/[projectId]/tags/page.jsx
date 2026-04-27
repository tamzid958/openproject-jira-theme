"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "@/components/tags";
import { LoadingPill } from "@/components/ui/loading-pill";
import { useApiStatus, useProjects, useTasks } from "@/lib/hooks/use-openproject";
import { useUrlParams } from "@/lib/hooks/use-modal-url";

export default function TagsPage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const router = useRouter();
  const { setParams } = useUrlParams();

  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const projectsQ = useProjects(configured);
  const tasksQ = useTasks(projectId, null, configured && !!projectId);
  const project = projectsQ.data?.find((p) => p.id === projectId) || null;

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Tags
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        {tasksQ.isLoading ? (
          <div className="p-10 text-center">
            <LoadingPill label="loading tags" />
          </div>
        ) : (
          <Tags
            projectId={projectId}
            projectName={project?.name}
            tasks={tasksQ.data || []}
            onTaskClick={(id) => setParams({ wp: id })}
            onFilter={(name) =>
              router.push(
                `/projects/${projectId}/backlog?label=${encodeURIComponent(name)}`,
              )
            }
          />
        )}
      </div>
    </>
  );
}
