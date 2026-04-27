"use client";

import { use } from "react";
import { Timeline } from "@/components/timeline";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useApiStatus,
  useSprints,
  useTasks,
} from "@/lib/hooks/use-openproject";
import { useAvailableAssignees } from "@/lib/hooks/use-openproject-detail";
import { useUrlParams } from "@/lib/hooks/use-modal-url";

export default function TimelinePage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const { setParams } = useUrlParams();

  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const tasksQ = useTasks(projectId, null, configured && !!projectId);
  const sprintsQ = useSprints(projectId, configured && !!projectId);
  const assigneesQ = useAvailableAssignees(projectId, configured && !!projectId);

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Timeline
        </h1>
      </div>
      <div className="flex-1 px-3 sm:px-6 py-3 sm:py-4 overflow-auto">
        {tasksQ.isLoading ? (
          <div className="p-10 text-center">
            <LoadingPill label="loading work packages" />
          </div>
        ) : tasksQ.error ? (
          <div className="p-6 text-pri-highest">{String(tasksQ.error.message)}</div>
        ) : (
          <Timeline
            tasks={tasksQ.data || []}
            sprints={sprintsQ.data || []}
            assignees={assigneesQ.data || []}
            isLoading={tasksQ.isLoading}
            onTaskClick={(id) => setParams({ wp: id })}
          />
        )}
      </div>
    </>
  );
}
