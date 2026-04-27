"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useApiStatus,
  useProjects,
  useSprints,
  useTasks,
} from "@/lib/hooks/use-openproject";
import { useMe } from "@/lib/hooks/use-openproject-detail";
import { useUrlParams } from "@/lib/hooks/use-modal-url";
import { pickSprintByDate } from "@/lib/hooks/use-active-sprint";

export default function OverviewPage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const router = useRouter();
  const { setParams } = useUrlParams();

  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const projectsQ = useProjects(configured);
  const tasksQ = useTasks(projectId, null, configured && !!projectId);
  const sprintsQ = useSprints(projectId, configured && !!projectId);
  const me = useMe();

  const project = projectsQ.data?.find((p) => p.id === projectId) || null;
  const activeSprint = pickSprintByDate(sprintsQ.data || []);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-0 pb-6">
      {tasksQ.isLoading ? (
        <div className="p-10 text-center">
          <LoadingPill label="loading overview" />
        </div>
      ) : (
        <Dashboard
          currentUser={me.data?.user || null}
          project={project}
          activeSprint={activeSprint}
          sprints={sprintsQ.data || []}
          tasks={tasksQ.data || []}
          onTaskClick={(id) => setParams({ wp: id })}
          onChangeView={(view) => router.push(`/projects/${projectId}/${view}`)}
        />
      )}
    </div>
  );
}
