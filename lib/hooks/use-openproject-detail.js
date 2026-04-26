"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";

const enabledOpts = (enabled, extra) => ({ enabled: !!enabled, ...extra });

// ── Identity ───────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ["op", "me"],
    queryFn: async () => {
      const session = await fetchJson("/api/auth/session");
      const u = session?.user || null;
      return { user: u ? { ...u, id: u.id || u.sub || null } : null };
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ── Single work package ────────────────────────────────────────────────

export function useWorkPackage(id, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", id],
    queryFn: () => fetchJson(`/api/openproject/work-packages/${encodeURIComponent(id)}`),
    ...enabledOpts(enabled && !!id),
  });
}

// ── Activities (comments + history) ────────────────────────────────────

export function useActivities(wpId, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", wpId, "activities"],
    queryFn: () =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/activities`),
    ...enabledOpts(enabled && !!wpId, { staleTime: 10_000 }),
  });
}

export function usePostComment(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["op", "wp", wpId, "activities"] });
      const prev = qc.getQueryData(["op", "wp", wpId, "activities"]);
      const optimistic = {
        id: `tmp-${Date.now()}`,
        kind: "comment",
        author: null,
        authorName: "You",
        createdAt: new Date().toISOString(),
        comment: text,
        details: [],
        _optimistic: true,
      };
      qc.setQueryData(["op", "wp", wpId, "activities"], (cur = []) => [...cur, optimistic]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["op", "wp", wpId, "activities"], ctx?.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "activities"),
  });
}

// Edit an existing comment in place. Optimistic + rollback so the row
// updates instantly and reverts on failure.
export function useUpdateComment(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }) =>
      fetchJson(`/api/openproject/activities/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    onMutate: async ({ id, text }) => {
      await qc.cancelQueries({ queryKey: ["op", "wp", wpId, "activities"] });
      const prev = qc.getQueryData(["op", "wp", wpId, "activities"]);
      qc.setQueryData(["op", "wp", wpId, "activities"], (cur = []) =>
        cur.map((a) => (a.id === id ? { ...a, comment: text } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["op", "wp", wpId, "activities"], ctx?.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "activities"),
  });
}

// ── Attachments ────────────────────────────────────────────────────────

export function useAttachments(wpId, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", wpId, "attachments"],
    queryFn: () =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/attachments`),
    ...enabledOpts(enabled && !!wpId),
  });
}

export function useUploadAttachment(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, description }) => {
      const fd = new FormData();
      fd.append("file", file);
      if (description) fd.append("description", description);
      const res = await fetch(
        `/api/openproject/work-packages/${encodeURIComponent(wpId)}/attachments`,
        { method: "POST", body: fd },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body?.error || `Upload failed (${res.status})`);
        err.status = res.status;
        err.code = body?.code;
        throw err;
      }
      return body;
    },
    onMutate: async ({ file, description }) => {
      const key = ["op", "wp", wpId, "attachments"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      const tempId = `tmp-att-${Date.now()}`;
      const optimistic = {
        id: tempId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        description: description || "",
        createdAt: new Date().toISOString(),
        author: null,
        authorName: "You",
        downloadUrl: null,
        permissions: { delete: true },
        _optimistic: true,
      };
      qc.setQueryData(key, (cur = []) => [optimistic, ...cur]);
      return { prev, key, tempId };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData(ctx.key, (cur = []) =>
        cur.map((a) => (a.id === ctx.tempId ? created : a)),
      );
    },
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "attachments"),
  });
}

export function useDeleteAttachment(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId) =>
      fetchJson(`/api/openproject/attachments/${encodeURIComponent(attachmentId)}`, {
        method: "DELETE",
      }),
    onMutate: async (attachmentId) => {
      const key = ["op", "wp", wpId, "attachments"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur = []) => cur.filter((a) => a.id !== String(attachmentId)));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "attachments"),
  });
}

// ── Watchers ───────────────────────────────────────────────────────────

export function useWatchers(wpId, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", wpId, "watchers"],
    queryFn: () =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/watchers`),
    ...enabledOpts(enabled && !!wpId),
  });
}

export function useAddWatcher(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/watchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }),
    onMutate: async (userId) => {
      const key = ["op", "wp", wpId, "watchers"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      const id = String(userId);
      qc.setQueryData(key, (cur = []) =>
        cur.some((u) => u.id === id)
          ? cur
          : [...cur, { id, name: "You", initials: "?", color: "var(--accent)", _optimistic: true }],
      );
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "watchers"),
  });
}

export function useRemoveWatcher(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      fetchJson(
        `/api/openproject/work-packages/${encodeURIComponent(wpId)}/watchers/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      ),
    onMutate: async (userId) => {
      const key = ["op", "wp", wpId, "watchers"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur = []) => cur.filter((u) => u.id !== String(userId)));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "watchers"),
  });
}

// ── Children (sub-tasks) ───────────────────────────────────────────────

export function useChildren(wpId, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", wpId, "children"],
    queryFn: () =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/children`),
    ...enabledOpts(enabled && !!wpId),
  });
}

export function useCreateChild(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onMutate: async (data) => {
      const childKey = ["op", "wp", wpId, "children"];
      await qc.cancelQueries({ queryKey: childKey });
      const prevChildren = qc.getQueryData(childKey);
      const tempId = `tmp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        nativeId: tempId,
        key: "…",
        title: data.title,
        type: "task",
        status: "todo",
        priority: "medium",
        labels: [],
        comments: 0,
        attachments: 0,
        createdAt: new Date().toISOString(),
        epic: String(wpId),
        permissions: { update: true },
        _optimistic: true,
      };
      qc.setQueryData(childKey, (cur = []) => [...cur, optimistic]);
      // Mirror into the project tasks lists so the recursive subtask tree
      // (built from in-memory tasks) shows the new row immediately.
      const allTaskKeys = qc.getQueriesData({ queryKey: ["op", "tasks"] });
      const prevTasks = allTaskKeys.map(([k, v]) => [k, v]);
      for (const [k, v] of allTaskKeys) {
        if (Array.isArray(v)) qc.setQueryData(k, [optimistic, ...v]);
      }
      return { childKey, prevChildren, prevTasks, tempId };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      qc.setQueryData(ctx.childKey, ctx.prevChildren);
      for (const [k, v] of ctx.prevTasks) qc.setQueryData(k, v);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["op", "wp", wpId, "children"] });
      qc.invalidateQueries({ queryKey: ["op", "wp", wpId] });
      qc.invalidateQueries({ queryKey: ["op", "tasks"] });
      qc.invalidateQueries({ queryKey: ["op", "open-counts"] });
    },
  });
}

// ── Time entries ───────────────────────────────────────────────────────

export function useTimeEntries(wpId, enabled = true) {
  return useQuery({
    queryKey: ["op", "wp", wpId, "time-entries"],
    queryFn: () =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/time-entries`),
    ...enabledOpts(enabled && !!wpId),
  });
}

export function useCreateTimeEntry(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      fetchJson(`/api/openproject/work-packages/${encodeURIComponent(wpId)}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onMutate: async (data) => {
      const key = ["op", "wp", wpId, "time-entries"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      const tempId = `tmp-${Date.now()}`;
      // The form sends hours as a number; render an ISO duration so the row
      // displays consistently with the canonical record.
      const isoHours = `PT${Math.round((data.hours || 0) * 60)}M`;
      const optimistic = {
        id: tempId,
        spentOn: data.spentOn,
        hoursIso: isoHours,
        comment: data.comment || "",
        user: null,
        userName: "You",
        workPackageId: String(wpId),
        createdAt: new Date().toISOString(),
        permissions: { update: true, delete: true },
        _optimistic: true,
      };
      qc.setQueryData(key, (cur = []) => [optimistic, ...cur]);
      return { prev, key, tempId };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData(ctx.key, (cur = []) =>
        cur.map((t) => (t.id === ctx.tempId ? created : t)),
      );
    },
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "time-entries"),
  });
}

export function useUpdateTimeEntry(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      fetchJson(`/api/openproject/time-entries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, ...patch }) => {
      const key = ["op", "wp", wpId, "time-entries"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur = []) =>
        cur.map((t) => (t.id === String(id) ? { ...t, ...patch } : t)),
      );
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "time-entries"),
  });
}

export function useDeleteTimeEntry(wpId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      fetchJson(`/api/openproject/time-entries/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onMutate: async (id) => {
      const key = ["op", "wp", wpId, "time-entries"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur = []) => cur.filter((t) => t.id !== String(id)));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => invalidateAfterWpChildChange(qc, wpId, "time-entries"),
  });
}

// Generic per-WP invalidator. Comments / attachments / watchers / time
// entries / sub-tasks all change the parent WP's lockVersion + counts and
// should also bump the WP-detail cache so the side panel reflects fresh
// state when the modal is open.
function invalidateAfterWpChildChange(qc, wpId, resource) {
  if (wpId) {
    qc.invalidateQueries({ queryKey: ["op", "wp", wpId, resource] });
    qc.invalidateQueries({ queryKey: ["op", "wp", wpId] });
  }
}

// ── Project-scoped assignees ──────────────────────────────────────────

// Returns only principals who can be set as the assignee of a WP in this
// project. Backed by OP's /projects/{id}/available_assignees endpoint —
// scoped per project so the dropdown isn't polluted by instance-wide
// users who aren't members.
export function useAvailableAssignees(projectId, enabled = true) {
  return useQuery({
    queryKey: ["op", "available-assignees", projectId],
    queryFn: () =>
      fetchJson(
        `/api/openproject/projects/${encodeURIComponent(projectId)}/available-assignees`,
      ),
    ...enabledOpts(enabled && !!projectId, { staleTime: 5 * 60_000 }),
  });
}

// ── Categories (labels) ────────────────────────────────────────────────

export function useCategories(projectId, enabled = true) {
  return useQuery({
    queryKey: ["op", "categories", projectId],
    queryFn: () =>
      fetchJson(`/api/openproject/projects/${encodeURIComponent(projectId)}/categories`),
    ...enabledOpts(enabled && !!projectId, { staleTime: 5 * 60_000 }),
  });
}

// ── Notifications ──────────────────────────────────────────────────────

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["op", "notifications"],
    queryFn: () => fetchJson("/api/openproject/notifications?unread=1"),
    refetchInterval: 60_000,
    ...enabledOpts(enabled),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) =>
      fetchJson("/api/openproject/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.isArray(ids) ? ids : [ids] }),
      }),
    onMutate: async (ids) => {
      const key = ["op", "notifications"];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      const targets = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
      qc.setQueryData(key, (cur) => {
        if (!cur) return cur;
        const items = (cur.items || []).map((n) =>
          targets.has(String(n.id)) ? { ...n, readIAN: true } : n,
        );
        const unread = items.filter((n) => !n.readIAN).length;
        return { ...cur, items, unread };
      });
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["op", "notifications"] }),
  });
}

// ── Versions (sprint state transitions) ───────────────────────────────

// Cross-resource invalidation: any version mutation can change the
// sprint name / membership of work packages, the burndown / velocity
// reports, and the cached project list (default version pointer). Always
// invalidate the lot so views don't show stale labels until a refresh.
function invalidateAfterVersionChange(qc, projectId) {
  qc.invalidateQueries({ queryKey: ["op", "sprints", projectId] });
  qc.invalidateQueries({ queryKey: ["op", "sprints"] });
  qc.invalidateQueries({ queryKey: ["op", "tasks", projectId] });
  qc.invalidateQueries({ queryKey: ["op", "burndown", projectId] });
  qc.invalidateQueries({ queryKey: ["op", "velocity", projectId] });
  qc.invalidateQueries({ queryKey: ["op", "projects"] });
}

export function useUpdateVersion(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }) =>
      fetchJson(`/api/openproject/versions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSettled: () => invalidateAfterVersionChange(qc, projectId),
  });
}

export function useCreateVersion(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      fetchJson("/api/openproject/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      }),
    onSettled: () => invalidateAfterVersionChange(qc, projectId),
  });
}

export function useDeleteVersion(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      fetchJson(`/api/openproject/versions/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSettled: () => invalidateAfterVersionChange(qc, projectId),
  });
}

// ── Velocity & Burndown ────────────────────────────────────────────────

export function useVelocity(projectId, enabled = true) {
  return useQuery({
    queryKey: ["op", "velocity", projectId],
    queryFn: () =>
      fetchJson(`/api/openproject/projects/${encodeURIComponent(projectId)}/velocity`),
    ...enabledOpts(enabled && !!projectId, { staleTime: 5 * 60_000 }),
  });
}

export function useBurndown(projectId, sprintId, enabled = true) {
  return useQuery({
    queryKey: ["op", "burndown", projectId, sprintId],
    queryFn: () =>
      fetchJson(
        `/api/openproject/projects/${encodeURIComponent(projectId)}/burndown?sprint=${encodeURIComponent(sprintId)}`,
      ),
    ...enabledOpts(enabled && !!projectId && !!sprintId, { staleTime: 5 * 60_000 }),
  });
}

// ── Project metadata ───────────────────────────────────────────────────

export function useProject(projectId, enabled = true) {
  return useQuery({
    queryKey: ["op", "project", projectId],
    queryFn: () => fetchJson(`/api/openproject/projects/${encodeURIComponent(projectId)}`),
    ...enabledOpts(enabled && !!projectId),
  });
}

export function useOpenCounts(enabled = true) {
  return useQuery({
    queryKey: ["op", "open-counts"],
    queryFn: () => fetchJson("/api/openproject/projects/open-counts"),
    ...enabledOpts(enabled, { staleTime: 60_000 }),
  });
}

// ── Schema & custom options ────────────────────────────────────────────

export function useWpSchema(schemaHref, enabled = true) {
  // schemaHref shape: "/api/v3/work_packages/schemas/<schema>"
  const schema = schemaHref ? schemaHref.split("/").pop() : null;
  return useQuery({
    queryKey: ["op", "schema", schema],
    queryFn: () => fetchJson(`/api/openproject/schemas/${encodeURIComponent(schema)}`),
    ...enabledOpts(enabled && !!schema, { staleTime: Infinity }),
  });
}

export function useCustomOptions(href, enabled = true) {
  return useQuery({
    queryKey: ["op", "custom-options", href],
    queryFn: () =>
      fetchJson(`/api/openproject/custom-options?href=${encodeURIComponent(href)}`),
    ...enabledOpts(enabled && !!href, { staleTime: 5 * 60_000 }),
  });
}

// ── Search ─────────────────────────────────────────────────────────────

export function useSearch(q, enabled = true) {
  return useQuery({
    queryKey: ["op", "search", q],
    queryFn: () => fetchJson(`/api/openproject/search?q=${encodeURIComponent(q)}`),
    ...enabledOpts(enabled && q && q.length >= 2, { staleTime: 30_000 }),
  });
}
