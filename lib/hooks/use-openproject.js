"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/work-packages";
import { enqueueOfflineMutation, isOnline } from "@/lib/offline/queue";

// Server Actions return `{ ok, data?, error?, code?, status? }`. This helper
// turns a failure into the same Error shape `fetchJson` throws so existing
// `onError` handlers (and `friendlyError`) keep working.
async function runAction(actionFn, input, fallback) {
  let res;
  try {
    res = await actionFn(input);
  } catch (e) {
    // Action call itself rejected — only true transport failures land here
    // (offline, server unreachable, RSC stream aborted). Tag as NETWORK_FAIL
    // so the offline queue captures and replays later.
    const err = new Error(e?.message || fallback || "Request failed");
    err.code = "NETWORK_FAIL";
    err.status = 0;
    throw err;
  }
  if (res?.ok) return res.data;
  // Structured failure from the action — preserve `code`/`status` so callers
  // can distinguish 4xx/5xx from a true network outage. Must not fall back
  // into the NETWORK_FAIL path: a null `code` here means OpenProject didn't
  // map this status to one of our known codes, NOT that the network failed.
  const err = new Error(res?.error || fallback || "Request failed");
  err.code = res?.code || null;
  err.status = res?.status || 500;
  throw err;
}

export function useApiStatus() {
  return useQuery({
    queryKey: ["op", "status"],
    queryFn: () => fetchJson("/api/openproject/status"),
    staleTime: Infinity,
  });
}

const stdOpts = (enabled) => ({
  enabled: !!enabled,
  staleTime: 30_000,
});

// Per-mount opts for high-churn collections (tasks, sprints): refetch when
// the user tabs back so stale OP changes flow in without a manual reload.
const liveOpts = (enabled) => ({
  enabled: !!enabled,
  staleTime: 15_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

export function useProjects(enabled) {
  return useQuery({
    queryKey: ["op", "projects"],
    queryFn: () => fetchJson("/api/openproject/projects"),
    ...stdOpts(enabled),
  });
}

export function useUsers(enabled) {
  return useQuery({
    queryKey: ["op", "users"],
    queryFn: () => fetchJson("/api/openproject/users"),
    ...stdOpts(enabled),
  });
}

export function useStatuses(enabled) {
  return useQuery({
    queryKey: ["op", "statuses"],
    queryFn: () => fetchJson("/api/openproject/statuses"),
    ...stdOpts(enabled),
  });
}

// `projectId` is optional — when provided, returns the WP types enabled for
// that project. When omitted (or empty), returns the global type list.
export function useTypes(projectIdOrEnabled, enabledArg) {
  const projectId =
    typeof projectIdOrEnabled === "string" ? projectIdOrEnabled : null;
  const enabled =
    typeof projectIdOrEnabled === "boolean" ? projectIdOrEnabled : enabledArg ?? true;
  const url = projectId
    ? `/api/openproject/types?project=${encodeURIComponent(projectId)}`
    : "/api/openproject/types";
  return useQuery({
    queryKey: ["op", "types", projectId || "global"],
    queryFn: () => fetchJson(url),
    ...stdOpts(enabled),
  });
}

export function usePriorities(enabled) {
  return useQuery({
    queryKey: ["op", "priorities"],
    queryFn: () => fetchJson("/api/openproject/priorities"),
    ...stdOpts(enabled),
  });
}

export function useSprints(projectId, enabled) {
  return useQuery({
    queryKey: ["op", "sprints", projectId],
    queryFn: () =>
      fetchJson(
        `/api/openproject/sprints${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`,
      ),
    ...liveOpts(enabled),
  });
}

// `sprintId` is optional. When provided ("all" | "backlog" | a sprint id),
// the work-package fetch is scoped server-side via the route's ?sprint=
// param. The cache key includes the sprint dimension so switching sprints
// doesn't poison a previously-cached pool.
export function useTasks(projectId, sprintId, enabled) {
  // Back-compat: useTasks(projectId, enabled) — second arg was bool.
  let sid = sprintId;
  let en = enabled;
  if (typeof sprintId === "boolean") {
    en = sprintId;
    sid = null;
  }
  const sprintKey = sid || "all";
  return useQuery({
    queryKey: ["op", "tasks", projectId, sprintKey],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectId) params.set("project", projectId);
      if (sid && sid !== "all") params.set("sprint", sid);
      const qs = params.toString();
      return fetchJson(`/api/openproject/tasks${qs ? `?${qs}` : ""}`);
    },
    ...liveOpts(en),
  });
}

// Cross-resource invalidation: any work-package mutation can change the
// per-WP detail cache, sub-task children, project-wide sprint counts,
// burndown / velocity reports, and the open-counts sidebar.
//
// We deliberately DO NOT invalidate the tasks list here. The optimistic
// patch in onMutate plus the server-response merge in onSuccess already
// keep that cache up to date — re-fetching it can briefly snap a freshly
// dragged card back to its old column when OP's GET hits an
// eventually-consistent replica that doesn't yet see the PATCH.
function invalidateAfterWpChange(qc, projectId, wpId) {
  if (projectId) {
    qc.invalidateQueries({ queryKey: ["op", "burndown", projectId] });
    qc.invalidateQueries({ queryKey: ["op", "velocity", projectId] });
  }
  qc.invalidateQueries({ queryKey: ["op", "open-counts"] });
  qc.invalidateQueries({ queryKey: ["op", "sprints"] });
  if (wpId) {
    qc.invalidateQueries({ queryKey: ["op", "wp", wpId] });
    // Children of any WP whose parent could've changed; safest is to nuke
    // every cached children list. The detail modal repopulates on demand.
    qc.invalidateQueries({
      queryKey: ["op", "wp"],
      predicate: (q) => q.queryKey[2] === "children" || q.queryKey[3] === "children",
    });
  }
}

// `projectId` scopes optimistic writes to the current project's cache so a
// mid-flight project switch can't bleed state into the wrong project. When
// undefined, falls back to the legacy wildcard for back-compat.
export function useUpdateTask(projectId) {
  const qc = useQueryClient();
  const scope = projectId ? ["op", "tasks", projectId] : ["op", "tasks"];
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      // Offline-first path: when there's no network the optimistic update
      // already moved the card; persist the intent and resolve so the UI
      // doesn't toast an error. The runner will replay when we reconnect.
      if (!isOnline()) {
        await enqueueOfflineMutation({
          kind: "task.update",
          payload: { id, patch, projectId },
        });
        return { id, ...patch };
      }
      try {
        return await runAction(
          updateTaskAction,
          { id, patch, projectId },
          "Couldn't save changes",
        );
      } catch (e) {
        if (e.code === "NETWORK_FAIL") {
          await enqueueOfflineMutation({
            kind: "task.update",
            payload: { id, patch, projectId },
          });
          return { id, ...patch };
        }
        throw e;
      }
    },
    onMutate: async ({ id, patch }) => {
      // Cancel in-flight tasks refetches so a slow GET that started before
      // this drag-drop can't land *after* our optimistic write and snap the
      // card back to its old column.
      await qc.cancelQueries({ queryKey: scope });
      const prev = qc.getQueriesData({ queryKey: scope });
      for (const [key, data] of prev) {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          );
        }
      }
      return { prev };
    },
    onSuccess: (server, vars) => {
      if (!server || typeof server !== "object") return;
      const id = vars.id;
      const all = qc.getQueriesData({ queryKey: scope });
      for (const [key, data] of all) {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.map((t) => (t.id === id ? { ...t, ...server } : t)),
          );
        }
      }
      qc.setQueryData(["op", "wp", server.nativeId ?? id], server);
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.prev || []) qc.setQueryData(key, data);
    },
    onSettled: (_data, _err, vars) => {
      invalidateAfterWpChange(qc, projectId, vars?.id);
    },
  });
}

// Stable id factory for optimistic temp records.
let __tmpCounter = 0;
const tmpId = () => `tmp-${Date.now()}-${++__tmpCounter}`;

// Delete a single work package by id. Optimistic + rollback so the row
// vanishes instantly across every cached tasks list.
export function useDeleteTask(projectId) {
  const qc = useQueryClient();
  const scope = projectId ? ["op", "tasks", projectId] : ["op", "tasks"];
  return useMutation({
    mutationFn: async (id) => {
      if (!isOnline()) {
        await enqueueOfflineMutation({
          kind: "task.delete",
          payload: { id, projectId },
        });
        return null;
      }
      try {
        return await runAction(
          deleteTaskAction,
          { id, projectId },
          "Couldn't delete this issue",
        );
      } catch (e) {
        if (e.code === "NETWORK_FAIL") {
          await enqueueOfflineMutation({
            kind: "task.delete",
            payload: { id, projectId },
          });
          return null;
        }
        throw e;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: scope });
      const prev = qc.getQueriesData({ queryKey: scope });
      for (const [key, data] of prev) {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.filter((t) => t.id !== id),
          );
        }
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.prev || []) qc.setQueryData(key, data);
    },
    onSettled: (_data, _err, id) => {
      invalidateAfterWpChange(qc, projectId, id);
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      // Creating offline is risky — we'd need to assign a temp id that
      // OpenProject won't recognise on replay. The optimistic card stays
      // visible (added in onMutate) but on replay we just drop the
      // payload as-is into OP, which mints the canonical id. The temp
      // record is reconciled when the tasks list next refetches.
      if (!isOnline()) {
        await enqueueOfflineMutation({ kind: "task.create", payload: data });
        return null;
      }
      try {
        return await runAction(createTaskAction, data, "Couldn't create issue");
      } catch (e) {
        if (e.code === "NETWORK_FAIL") {
          await enqueueOfflineMutation({ kind: "task.create", payload: data });
          return null;
        }
        throw e;
      }
    },
    onMutate: async (vars) => {
      // Pre-pend a temp record so the new card shows up instantly. Tasks
      // are now keyed by (projectId, sprintId) — write into every variant
      // under the project so the new card is visible regardless of which
      // sprint scope the active list is using.
      await qc.cancelQueries({ queryKey: ["op", "tasks", vars.projectId] });
      const id = tmpId();
      const optimistic = {
        id,
        nativeId: id,
        key: "…",
        title: vars.title,
        description: vars.description || "",
        type: vars.type || "task",
        status: "todo",
        statusId: vars.statusId || null,
        statusName: null,
        priority: vars.priority || "medium",
        priorityId: vars.priorityId || null,
        priorityName: null,
        assignee: vars.assignee || null,
        assigneeName: null,
        sprint: vars.sprint || null,
        labels: [],
        points: null,
        comments: 0,
        attachments: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: { update: true },
        _optimistic: true,
      };
      const scope = ["op", "tasks", vars.projectId];
      const prev = qc.getQueriesData({ queryKey: scope });
      for (const [key, data] of prev) {
        if (Array.isArray(data)) {
          qc.setQueryData(key, [optimistic, ...data]);
        }
      }
      return { prev, tempId: id, projectId: vars.projectId };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.prev || []) qc.setQueryData(key, data);
    },
    onSuccess: (created, vars, ctx) => {
      // Replace the temp record with the canonical one in every variant.
      const scope = ["op", "tasks", vars.projectId];
      const all = qc.getQueriesData({ queryKey: scope });
      for (const [key, data] of all) {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.map((t) => (t.id === ctx?.tempId ? created : t)),
          );
        }
      }
    },
    onSettled: (_data, _err, vars) => {
      invalidateAfterWpChange(qc, vars.projectId);
    },
  });
}
