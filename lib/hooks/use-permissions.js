"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";

const fetchPermissions = () => fetchJson("/api/openproject/permissions");

// Fetched once and cached for 5 min — long enough that browsing the app feels
// snappy, short enough that a role grant in OpenProject takes effect on the
// next view switch instead of forcing a sign-out.
export function useViewerPermissions() {
  return useQuery({
    queryKey: ["op", "viewer-permissions"],
    queryFn: fetchPermissions,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}

// Returns `true` if the viewer is admin OR the project's permission set
// includes the requested key. Returns `false` while loading — UI gates
// fail closed so we never flash a button that's about to disappear.
export function usePermission(projectId, permKey) {
  const { data } = useViewerPermissions();
  if (!data) return false;
  if (data.admin) return true;
  if (!projectId || !permKey) return false;
  const set = data.byProject?.[String(projectId)];
  return Array.isArray(set) ? set.includes(permKey) : false;
}

// `false` until the viewer-permissions query resolves. Useful for showing
// loading affordances on permission-gated controls.
export function usePermissionsReady() {
  const { data, isLoading } = useViewerPermissions();
  return !isLoading && !!data;
}

// Loading-aware variant of `usePermission`. Returns `{ allowed, loading }`
// so call sites can render disabled-while-loading buttons rather than
// silently hiding them and then popping them in once /permissions returns.
export function usePermissionWithLoading(projectId, permKey) {
  const { data, isLoading } = useViewerPermissions();
  const loading = isLoading || !data;
  let allowed = false;
  if (data) {
    if (data.admin) allowed = true;
    else if (projectId && permKey) {
      const set = data.byProject?.[String(projectId)];
      allowed = Array.isArray(set) ? set.includes(permKey) : false;
    }
  }
  return { allowed, loading };
}
