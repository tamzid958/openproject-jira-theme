"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CenterError,
  CenterLoader,
  CenterNotConfigured,
  CenterStatus,
} from "@/components/ui/center-status";
import { useApiStatus, useProjects } from "@/lib/hooks/use-openproject";

// Project picker landing. Hydrates from the saved "last project" cookie if
// it still exists, otherwise routes to the first project in the list.
export default function ProjectsLanding() {
  const router = useRouter();
  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const projectsQ = useProjects(configured);

  useEffect(() => {
    if (!projectsQ.isSuccess) return;
    const list = projectsQ.data || [];
    if (list.length === 0) return;
    let saved = null;
    try {
      saved = window.localStorage.getItem("op:current-project");
    } catch {
      // Ignore privacy-mode / quota errors.
    }
    const target = (saved && list.find((p) => p.id === saved)) || list[0];
    router.replace(`/projects/${target.id}/board`);
  }, [projectsQ.isSuccess, projectsQ.data, router]);

  if (status.isLoading) return <CenterLoader label="Connecting…" />;
  if (!configured) return <CenterNotConfigured />;
  if (projectsQ.isLoading) return <CenterLoader label="Loading projects…" />;
  if (projectsQ.error)
    return (
      <CenterError
        title="Couldn't load projects"
        message={String(projectsQ.error.message)}
      />
    );
  if ((projectsQ.data || []).length === 0)
    return (
      <CenterStatus>
        <h2 className="display-serif text-[34px] font-light text-fg m-0 mb-3 italic">
          A blank workspace.
        </h2>
        <p className="text-fg-muted m-0 text-[14px] leading-relaxed">
          Your OpenProject account doesn&apos;t have any visible projects.
        </p>
      </CenterStatus>
    );
  return <CenterLoader label="Opening project…" />;
}
