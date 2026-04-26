"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { Sidebar } from "@/components/sidebar";
import { Dashboard } from "@/components/dashboard";
import { Board } from "@/components/board";
import { Backlog } from "@/components/backlog";
import { Reports } from "@/components/reports";
import { Timeline } from "@/components/timeline";
import { Tags } from "@/components/tags";
import { TaskDetail } from "@/components/task-detail";
import { CreateTask } from "@/components/create-task";
import { SprintModal } from "@/components/sprint-modal";
import { CreateSprintModal } from "@/components/create-sprint";
import { CompleteSprintModal } from "@/components/complete-sprint-modal";
import { EditSprintModal } from "@/components/edit-sprint-modal";
import { SprintActionsRow } from "@/components/sprint-actions-row";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CommandPalette } from "@/components/command-palette";
import {
  TweaksPanel,
  TweakSection,
  TweakColor,
  TweakRadio,
  TweakButton,
  useTweaks,
} from "@/components/tweaks-panel";
import { Menu } from "@/components/ui/menu";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import { ACCENTS, PEOPLE, PROJECTS, syncPeople, syncProjects } from "@/lib/data";
import {
  useApiStatus,
  useCreateTask,
  useDeleteTask,
  usePriorities,
  useProjects,
  useSprints,
  useStatuses,
  useTasks,
  useTypes,
  useUpdateTask,
  useUsers,
} from "@/lib/hooks/use-openproject";
import {
  useAvailableAssignees,
  useCategories,
  useCreateVersion,
  useDeleteVersion,
  useMe,
} from "@/lib/hooks/use-openproject-detail";
import { usePermission, usePermissionWithLoading } from "@/lib/hooks/use-permissions";
import { PERM } from "@/lib/openproject/permission-keys";
import { fetchJson, friendlyError } from "@/lib/api-client";
import { useUrlState } from "@/lib/hooks/use-url-state";

const TWEAK_DEFAULTS = {
  accent: "#2563eb",
  density: "comfortable",
  sidebarStyle: "wide",
  showSwimlanes: false,
};

function CenteredCard({ children }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        width: "100vw",
        background: "var(--bg-app)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 28,
          boxShadow: "var(--shadow-md)",
          fontSize: 14,
          color: "var(--text)",
          lineHeight: 1.55,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <CenteredCard>
      <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 8 }}>
        Connect to OpenProject
      </h2>
      <p style={{ color: "var(--text-2)", margin: "0 0 16px" }}>
        Configure these env vars in <code>.env.local</code> and restart the dev server:
      </p>
      <pre
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          fontSize: 12.5,
          fontFamily: "var(--font-mono)",
          margin: 0,
          overflow: "auto",
        }}
      >
{`OPENPROJECT_URL=https://your-instance
OPENPROJECT_OAUTH_CLIENT_ID=...
OPENPROJECT_OAUTH_CLIENT_SECRET=...
AUTH_SECRET=...`}
      </pre>
    </CenteredCard>
  );
}

function FullScreenLoader({ label = "Loading…" }) {
  return (
    <CenteredCard>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-2)" }}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2px solid var(--accent-200)",
            borderTopColor: "var(--accent)",
            animation: "twk-spin 0.7s linear infinite",
          }}
        />
        {label}
      </div>
      <style>{`@keyframes twk-spin { to { transform: rotate(360deg) } }`}</style>
    </CenteredCard>
  );
}

function ErrorCard({ title, message }) {
  return (
    <CenteredCard>
      <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>
        {title}
      </h2>
      <pre
        style={{
          color: "var(--pri-highest)",
          background: "var(--bg-subtle)",
          padding: 12,
          borderRadius: 8,
          fontSize: 12.5,
          fontFamily: "var(--font-mono)",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {message}
      </pre>
    </CenteredCard>
  );
}

export default function App() {
  const url = useUrlState();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Project hydration order: URL > localStorage > first-loaded.
  const [currentProjectId, setCurrentProjectId] = useState(() => {
    if (url.projectId) return url.projectId;
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem("op:current-project") || null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState(url.view || "board");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(url.taskId || null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState({ sprint: null, status: null });
  const [startSprintFor, setStartSprintFor] = useState(null);
  const [completeSprintFor, setCompleteSprintFor] = useState(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [editSprintFor, setEditSprintFor] = useState(null);
  const [deleteSprintFor, setDeleteSprintFor] = useState(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  // Bulk-delete state. `for` carries the work-package id list and a
  // `clearSelection` callback so the bulk-action bar in Backlog clears
  // when the delete actually succeeds (not when the modal opens).
  const [bulkDeleteFor, setBulkDeleteFor] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Filters are tracked per page view so switching board → backlog → board
  // preserves each view's chip selection. The Sprint filter is hydrated from
  // the URL once on mount; per-view writes flow through setFilters below.
  const DEFAULT_FILTERS = {
    assignee: "all",
    epic: "all",
    type: "all",
    label: "all",
    sprint: "all",
    q: "",
  };
  // Each view owns its filter state; updates from one view never touch
  // another. The Board's sprint filter is the canonical "active sprint" —
  // URL hydration and the date-based default seed only that slot.
  const [filtersByView, setFiltersByView] = useState({
    board: { ...DEFAULT_FILTERS, sprint: url.sprint || "all" },
    backlog: { ...DEFAULT_FILTERS, sprint: "all" },
    timeline: { ...DEFAULT_FILTERS },
    reports: { ...DEFAULT_FILTERS },
    overview: { ...DEFAULT_FILTERS },
    tags: { ...DEFAULT_FILTERS },
  });
  const filters = filtersByView[view] || DEFAULT_FILTERS;
  const setFilters = (updater) =>
    setFiltersByView((prev) => {
      const cur = prev[view] || DEFAULT_FILTERS;
      const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
      return { ...prev, [view]: next };
    });
  const setBoardFilters = (updater) =>
    setFiltersByView((prev) => {
      const cur = prev.board || DEFAULT_FILTERS;
      const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
      return { ...prev, board: next };
    });
  const boardFilters = filtersByView.board || DEFAULT_FILTERS;
  const [filterMenu, setFilterMenu] = useState(null);
  const [groupBy, setGroupBy] = useState("status");

  const status = useApiStatus();
  const me = useMe();
  const configured = status.data?.configured === true;

  const projectsQ = useProjects(configured);
  const usersQ = useUsers(configured);
  const statusesQ = useStatuses(configured);
  const typesQ = useTypes(currentProjectId, configured && !!currentProjectId);
  const prioritiesQ = usePriorities(configured);
  const sprintsQ = useSprints(currentProjectId, configured && !!currentProjectId);
  const tasksQ = useTasks(currentProjectId, configured && !!currentProjectId);
  const categoriesQ = useCategories(currentProjectId, configured && !!currentProjectId);
  const assigneesQ = useAvailableAssignees(currentProjectId, configured && !!currentProjectId);

  const updateTaskMutation = useUpdateTask(currentProjectId);
  const createTaskMutation = useCreateTask();
  const createVersionMutation = useCreateVersion(currentProjectId);
  const deleteVersionMutation = useDeleteVersion(currentProjectId);
  const deleteTaskMutation = useDeleteTask(currentProjectId);

  const canCreateIssue = usePermission(currentProjectId, PERM.ADD_WORK_PACKAGES);
  const manageVersions = usePermissionWithLoading(currentProjectId, PERM.MANAGE_VERSIONS);
  const canManageVersions = manageVersions.allowed;

  // Apply accent.
  useEffect(() => {
    const a = tweaks.accent;
    const variant = ACCENTS[a] || ACCENTS["#2563eb"];
    document.documentElement.style.setProperty("--accent", a);
    document.documentElement.style.setProperty("--accent-600", variant[600]);
    document.documentElement.style.setProperty("--accent-700", variant[700]);
    document.documentElement.style.setProperty("--accent-50", variant[50]);
    document.documentElement.style.setProperty("--accent-100", variant[100]);
    document.documentElement.style.setProperty("--accent-200", variant[200]);
  }, [tweaks.accent]);

  // Sync reference data into static imports so child components see live values.
  useEffect(() => {
    if (projectsQ.data) syncProjects(projectsQ.data);
  }, [projectsQ.data]);
  useEffect(() => {
    if (usersQ.data) syncPeople(usersQ.data);
  }, [usersQ.data]);
  // Project-scoped epic list, derived from the tasks pool. Used as the
  // option set for the Epic/Parent picker in TaskDetail + CreateTask, and
  // for the "Epic" filter chip on Backlog. Pure derivation — no static
  // fallback or global cache.
  const epicsList = useMemo(() => {
    if (!tasksQ.data) return [];
    return tasksQ.data
      .filter((t) => t.type === "epic")
      .map((t) => ({
        id: String(t.nativeId),
        nativeId: String(t.nativeId),
        key: t.key,
        title: t.title,
        name: t.title,
        color: "var(--accent)",
      }));
  }, [tasksQ.data]);

  useEffect(() => {
    if (!projectsQ.data?.length) return;
    const exists = currentProjectId && projectsQ.data.some((p) => p.id === currentProjectId);
    if (!exists) {
      setCurrentProjectId(projectsQ.data[0].id);
    }
  }, [projectsQ.data, currentProjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentProjectId) return;
    try {
      window.localStorage.setItem("op:current-project", currentProjectId);
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [currentProjectId]);

  // Sync the four state slices (project, view, taskId, sprint) into the URL
  // so refresh / back / forward / shareable links work. We only write when
  // the value differs from what's already there to avoid replace loops.
  useEffect(() => {
    const patch = {};
    if (currentProjectId !== url.projectId) patch.p = currentProjectId || null;
    if (view !== (url.view || "board")) patch.v = view === "board" ? null : view;
    if (activeTaskId !== url.taskId) patch.wp = activeTaskId || null;
    // ?s= is the canonical "active sprint" — only Board's sprint filter
    // round-trips through the URL. Backlog has its own independent chip.
    if (boardFilters.sprint !== (url.sprint || "all")) {
      patch.s = boardFilters.sprint === "all" ? null : boardFilters.sprint;
    }
    if (Object.keys(patch).length > 0) url.set(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, view, activeTaskId, boardFilters.sprint]);

  // React to browser back/forward — when the URL changes externally, mirror
  // it into local state. Only adopts URL values that differ from current.
  useEffect(() => {
    if (url.projectId && url.projectId !== currentProjectId) {
      setCurrentProjectId(url.projectId);
    }
    const wantedView = url.view || "board";
    if (wantedView !== view) setView(wantedView);
    if ((url.taskId || null) !== activeTaskId) setActiveTaskId(url.taskId || null);
    const wantedSprint = url.sprint || "all";
    if (wantedSprint !== boardFilters.sprint) {
      setBoardFilters((f) => ({ ...f, sprint: wantedSprint }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url.projectId, url.view, url.taskId, url.sprint]);

  // Default the Sprint filter when the project changes. We choose by date,
  // not just "first open sprint" — many OP projects keep several open
  // versions in flight, and the user expects the one that's running *today*.
  // Order of preference:
  //   1. Sprint whose [start, end] contains today (open or otherwise).
  //   2. Closest *upcoming* open sprint (smallest start − today).
  //   3. Most recent *past* sprint (largest end < today).
  //   4. First sprint in the list, or "all" if none.
  const lastProjectForSprintDefault = useRef(null);
  useEffect(() => {
    if (!currentProjectId) return;
    if (!sprintsQ.data) return;
    if (lastProjectForSprintDefault.current === currentProjectId) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const withDates = (sprintsQ.data || []).filter(
      (s) => s.start && s.start !== "—" && s.end && s.end !== "—",
    );

    // Persisted per-project selection takes precedence: if the user picked
    // a sprint last session and it still exists in the project, restore it.
    let pick = null;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(`op:board-sprint:${currentProjectId}`);
        if (saved && sprintsQ.data.some((s) => s.id === saved)) {
          pick = sprintsQ.data.find((s) => s.id === saved);
        } else if (saved === "all" || saved === "backlog") {
          pick = { id: saved };
        }
      } catch {
        // localStorage unavailable (private mode / SSR) — fall through.
      }
    }

    if (!pick) {
      pick =
        // Preferred: an open sprint that runs over today.
        withDates.find(
          (s) => s.state !== "closed" && s.start <= todayIso && todayIso <= s.end,
        ) ||
        // Fallback: the latest open sprint that has started, even if its end
        // date has slipped past today.
        withDates
          .filter((s) => s.state !== "closed" && s.start <= todayIso)
          .sort((a, b) => b.start.localeCompare(a.start))[0] ||
        // Fallback: closest upcoming open sprint.
        withDates
          .filter((s) => s.state !== "closed" && s.start > todayIso)
          .sort((a, b) => a.start.localeCompare(b.start))[0] ||
        // Fallback: most recent past sprint, regardless of state.
        withDates
          .filter((s) => s.end < todayIso)
          .sort((a, b) => b.end.localeCompare(a.end))[0] ||
        sprintsQ.data[0];
    }

    // Seed only the Board's sprint filter — that's the canonical "active
    // sprint". Backlog / Reports / etc. keep whatever the user has set there.
    setBoardFilters((f) => ({ ...f, sprint: pick?.id || "all" }));
    lastProjectForSprintDefault.current = currentProjectId;
  }, [currentProjectId, sprintsQ.data]);

  // Persist the Board's sprint selection per-project so a hard refresh
  // restores it. Cleared if the user picks "all".
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentProjectId) return;
    try {
      const key = `op:board-sprint:${currentProjectId}`;
      if (boardFilters.sprint && boardFilters.sprint !== "all") {
        window.localStorage.setItem(key, boardFilters.sprint);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [currentProjectId, boardFilters.sprint]);

  // Stale-sprint guard: if the Board's selected sprint vanishes from the
  // list (someone closed/deleted the version in OP), reset to "all" so the
  // chip, page header, day-counter and URL all stop pointing at a ghost.
  useEffect(() => {
    if (!sprintsQ.data) return;
    const sid = boardFilters.sprint;
    if (!sid || sid === "all" || sid === "backlog") return;
    if (!sprintsQ.data.some((s) => s.id === sid)) {
      setBoardFilters((f) => ({ ...f, sprint: "all" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprintsQ.data, boardFilters.sprint]);

  // The keyboard shortcut reads activeSprint?.id at click time via a ref —
  // activeSprint is computed further down the component, so closing over it
  // directly would hit a temporal-dead-zone on render.
  const activeSprintIdRef = useRef(null);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      const isCmd = e.metaKey || e.ctrlKey;

      if (e.key === "k" && isCmd) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (inField) return;
      if (e.key === "c" && !isCmd) {
        e.preventDefault();
        setCreateDefaults({
          sprint: view === "board" ? activeSprintIdRef.current || null : null,
          status: null,
        });
        setCreateOpen(true);
      }
      if (e.key === "b" && !isCmd) {
        e.preventDefault();
        setView("board");
      }
      if (e.key === "g" && !isCmd) {
        const handler = (e2) => {
          if (e2.key === "b") setView("backlog");
          if (e2.key === "d") setView("overview");
          if (e2.key === "r") setView("reports");
          if (e2.key === "t") setView("timeline");
          window.removeEventListener("keydown", handler);
        };
        window.addEventListener("keydown", handler);
        setTimeout(() => window.removeEventListener("keydown", handler), 1000);
      }
      if (e.key === "Escape") {
        setActiveTaskId(null);
        setCreateOpen(false);
        setStartSprintFor(null);
        setCompleteSprintFor(null);
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const tasks = useMemo(() => tasksQ.data || [], [tasksQ.data]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.assignee !== "all" && t.assignee !== filters.assignee) return false;
      if (filters.epic !== "all" && t.epic !== filters.epic) return false;
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.label !== "all" && !(t.labels || []).includes(filters.label)) return false;
      if (filters.sprint === "backlog" && t.sprint) return false;
      if (filters.sprint !== "all" && filters.sprint !== "backlog" && t.sprint !== filters.sprint) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const findIdForBucket = (list, bucket) =>
    list?.find((x) => x.bucket === bucket)?.id ?? null;

  // Resolve bucket → API id once so callers can pass the friendly bucket
  // ("todo", "high", "task") and we still write the real OpenProject id.
  const resolveApiPatch = (patch) => {
    const apiPatch = { ...patch };
    if (patch.status && !patch.statusId) {
      const statusId = findIdForBucket(statusesQ.data, patch.status);
      if (statusId) apiPatch.statusId = statusId;
    }
    if (patch.priority && !patch.priorityId) {
      const priorityId = findIdForBucket(prioritiesQ.data, patch.priority);
      if (priorityId) apiPatch.priorityId = priorityId;
    }
    if (patch.type && !patch.typeId) {
      const typeId = findIdForBucket(typesQ.data, patch.type);
      if (typeId) apiPatch.typeId = typeId;
    }
    return apiPatch;
  };

  const updateTask = (id, patch) => {
    updateTaskMutation.mutate({ id, patch: resolveApiPatch(patch) });
  };
  // Awaitable variant for bulk operations.
  const updateTaskAsync = (id, patch) =>
    updateTaskMutation.mutateAsync({ id, patch: resolveApiPatch(patch) });

  // Concurrent-batch runner for bulk patches. Returns { ok, gone, failed }.
  const runBatched = async (ids, patchFor, batchSize = 8) => {
    let ok = 0;
    let gone = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += batchSize) {
      const slice = ids.slice(i, i + batchSize);
      await Promise.all(
        slice.map(async (id) => {
          try {
            await updateTaskAsync(id, patchFor(id));
            ok += 1;
          } catch (err) {
            // 404 = WP already gone. 409 = lock conflict; opPatchWithLock
            // already retried once, so a persistent 409 is a real failure.
            if (err?.status === 404) gone += 1;
            else failed += 1;
          }
        }),
      );
    }
    return { ok, gone, failed };
  };

  // Align every WP in a sprint to the sprint window and roll points up
  // through the parent chain. Triggered from the timeline's sprint row.
  //
  //   1. For each task whose `sprint === sprintId`, PATCH startDate /
  //      dueDate to the sprint window. Sprint assignment is already
  //      true for these rows but we send it anyway so the assignment is
  //      reaffirmed for any optimistic-state mismatch.
  //   2. Build a parent→children index from the same task pool, walk it
  //      bottom-up, and PATCH each parent's `points` to the sum of its
  //      descendants' points. Leaves keep whatever they have.
  //
  // Notes on points: when the configured story-points field is a
  // CustomOption (t-shirt sizes), the server PATCH route resolves a
  // numeric sum back to an option label via `resolveOptionForLabel`.
  // If no label matches, the parent's points are cleared — that's the
  // expected behaviour the user opted into by clicking Sync.
  const syncSprint = async (sprintId) => {
    const sp = sprintsList.find((s) => String(s.id) === String(sprintId));
    if (!sp) return;
    const start = sp.start && sp.start !== "—" ? sp.start : null;
    const end = sp.end && sp.end !== "—" ? sp.end : null;
    if (!start || !end) {
      toast.error("Sprint has no start/end dates yet");
      return;
    }
    const sprintTasks = (tasksQ.data || []).filter(
      (t) => String(t.sprint) === String(sprintId),
    );
    if (sprintTasks.length === 0) {
      toast.message("No tasks to sync in this sprint");
      return;
    }

    const pending = toast.loading(`Syncing ${sprintTasks.length} tasks to sprint window…`);

    // ── Step 1: dates + sprint assignment ────────────────────────
    const dateRes = await runBatched(
      sprintTasks.map((t) => t.id),
      () => ({ startDate: start, dueDate: end, sprint: sprintId }),
    );

    // ── Step 2: roll up points (only for parents in this pool) ──
    const byNative = new Map();
    for (const t of sprintTasks) byNative.set(String(t.nativeId), t);

    const childIndex = new Map();
    for (const t of sprintTasks) {
      const parentKey = t.epic ? String(t.epic) : null;
      if (parentKey && byNative.has(parentKey)) {
        if (!childIndex.has(parentKey)) childIndex.set(parentKey, []);
        childIndex.get(parentKey).push(t);
      }
    }

    const cache = new Map();
    const sumOf = (nativeId) => {
      const k = String(nativeId);
      if (cache.has(k)) return cache.get(k);
      const kids = childIndex.get(k) || [];
      const t = byNative.get(k);
      let total;
      if (kids.length === 0) {
        total = Number(t?.points) || 0;
      } else {
        total = kids.reduce((s, c) => s + sumOf(c.nativeId), 0);
      }
      cache.set(k, total);
      return total;
    };

    const parents = sprintTasks.filter((t) =>
      childIndex.has(String(t.nativeId)),
    );
    let ptsRes = { ok: 0, gone: 0, failed: 0 };
    if (parents.length > 0) {
      ptsRes = await runBatched(parents.map((t) => t.id), (id) => {
        const p = parents.find((x) => x.id === id);
        return { points: sumOf(p.nativeId) };
      });
    }

    toast.dismiss(pending);
    const totalFailed = dateRes.failed + ptsRes.failed;
    if (totalFailed > 0) {
      toast.error(
        `Synced with ${totalFailed} failure${totalFailed === 1 ? "" : "s"} — see OpenProject.`,
      );
    } else {
      toast.success(
        `Sprint synced — dates aligned${parents.length > 0 ? `, ${parents.length} parent${parents.length === 1 ? "" : "s"} rolled up` : ""}.`,
      );
    }
  };

  // Direct status-id move (used by Board drag-drop and any caller that
  // already has the OpenProject status ID).
  const moveTaskByStatusId = (id, statusId) => {
    const t = tasks.find((x) => x.id === id);
    const target = (statusesQ.data || []).find((s) => String(s.id) === String(statusId));
    updateTaskMutation.mutate({
      id,
      patch: {
        statusId,
        status: target?.bucket || t?.status,
        statusName: target?.name,
      },
    });
    if (t && target) toast.success(`${t.key} → ${target.name}`);
  };

  // Bucket-based move kept for callers that still think in buckets (Backlog
  // row inline status pill, etc.).
  const moveTaskStatus = (id, bucket) => {
    const t = tasks.find((x) => x.id === id);
    updateTask(id, { status: bucket });
    const statusName = (statusesQ.data || []).find((s) => s.bucket === bucket)?.name || bucket;
    if (t) toast.success(`${t.key} → ${statusName}`);
  };

  const moveTaskSprint = (id, sprintId) => {
    const t = tasks.find((x) => x.id === id);
    updateTask(id, { sprint: sprintId });
    const sprintName = sprintId
      ? (sprintsQ.data || []).find((s) => s.id === sprintId)?.name?.split(" — ")[0] || "Sprint"
      : "Backlog";
    if (t) toast.success(`${t.key} moved to ${sprintName}`);
  };

  const createIssue = (data) => {
    if (!currentProjectId) {
      toast.error("Pick a project first");
      return;
    }
    createTaskMutation.mutate(
      {
        projectId: currentProjectId,
        title: data.title,
        description: data.description,
        // `data.type` is the unique OP type id when types loaded; fall back
        // to bucket lookup when the form was filled before types arrived.
        typeId:
          (typesQ.data || []).some((t) => String(t.id) === String(data.type))
            ? data.type
            : findIdForBucket(typesQ.data, data.type || "task"),
        statusId: findIdForBucket(statusesQ.data, data.status || "todo"),
        priorityId: findIdForBucket(prioritiesQ.data, data.priority || "medium"),
        assignee: data.assignee,
        sprint: data.sprint,
        categoryIds: data.categoryIds,
      },
      {
        onSuccess: (created) => toast.success(`Created ${created?.key || "issue"}`),
        onError: (e) => toast.error(friendlyError(e, "Couldn't create issue — please try again.")),
      },
    );
  };

  const createSprint = async (cfg) => {
    try {
      await createVersionMutation.mutateAsync({
        name: cfg.name,
        description: cfg.goal,
        startDate: cfg.start,
        endDate: cfg.end,
      });
      toast.success(`Sprint created · ${cfg.name}`);
      setCreateSprintOpen(false);
      setView("backlog");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't create sprint — please try again."));
      throw e;
    }
  };

  // Render gates ─────────────────────────────────────────────────────────
  if (status.isLoading) return <FullScreenLoader label="Connecting…" />;
  if (!configured) return <NotConfigured />;
  if (projectsQ.isLoading && PROJECTS.length === 0) return <FullScreenLoader label="Loading projects…" />;
  if (projectsQ.error)
    return <ErrorCard title="Couldn't load projects" message={String(projectsQ.error.message)} />;
  if ((projectsQ.data || []).length === 0)
    return (
      <CenteredCard>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18 }}>No projects</h2>
        <p style={{ color: "var(--text-2)" }}>
          Your OpenProject account doesn&apos;t have any visible projects.
        </p>
      </CenteredCard>
    );
  if (!currentProjectId) return <FullScreenLoader label="Selecting project…" />;

  const project = PROJECTS.find((p) => p.id === currentProjectId) || projectsQ.data?.[0] || null;
  // The "active sprint" used in headers / dashboard / reports follows the
  // user's Sprint filter selection — otherwise the page title and day-counter
  // can disagree with the filter chip ("Sprint 3 board · Day 0 of 12" while
  // the chip is on Sprint 4). When the filter is "all" / "backlog" / unset,
  // fall back to the same date-based heuristic the default selection uses.
  const sprintsList = sprintsQ.data || [];
  const todayIso = new Date().toISOString().slice(0, 10);
  // Single source of truth: the Board's sprint filter is the canonical
  // "active sprint" across the app. Reports has its own filter; everything
  // else (Backlog, Overview, Tags) falls back to the date heuristic.
  const datedSprints = sprintsList.filter(
    (s) => s.start && s.start !== "—" && s.end && s.end !== "—",
  );
  const sprintByDate =
    datedSprints.find(
      (s) => s.state !== "closed" && s.start <= todayIso && todayIso <= s.end,
    ) ||
    datedSprints
      .filter((s) => s.state !== "closed" && s.start <= todayIso)
      .sort((a, b) => b.start.localeCompare(a.start))[0] ||
    datedSprints
      .filter((s) => s.state !== "closed" && s.start > todayIso)
      .sort((a, b) => a.start.localeCompare(b.start))[0] ||
    sprintsList[0] ||
    null;
  const sprintFromBoardFilter =
    sprintsList.find((s) => s.id === boardFilters.sprint) || null;
  const sprintFromReportsFilter =
    sprintsList.find((s) => s.id === (filtersByView.reports || DEFAULT_FILTERS).sprint) || null;
  const activeSprint =
    view === "board"
      ? sprintFromBoardFilter || sprintByDate
      : view === "reports"
      ? sprintFromReportsFilter || sprintByDate
      : sprintByDate;
  // Keep the ref the keyboard shortcut reads from in sync with the latest
  // computed activeSprint (avoids the temporal-dead-zone the dep array hit).
  activeSprintIdRef.current = activeSprint?.id || null;
  const currentUser = me.data?.user || null;

  const pageTitle =
    view === "overview"
      ? "Overview"
      : view === "board"
      ? activeSprint
        ? `${activeSprint.name.split(" — ")[0]} board`
        : "Board"
      : view === "backlog"
      ? "Backlog"
      : view === "timeline"
      ? "Timeline"
      : view === "reports"
      ? "Reports"
      : view === "tags"
      ? "Tags"
      : "Project";

  const labelOptions = (categoriesQ.data || []).map((c) => ({
    label: c.name,
    value: c.name,
    active: filters.label === c.name,
  }));

  return (
    <div
      className="grid grid-cols-[240px_minmax(0,1fr)] grid-rows-[48px_minmax(0,1fr)] h-screen w-screen overflow-hidden"
      data-density={tweaks.density}
      data-sidebar={tweaks.sidebarStyle}
    >
      <Topbar
        canCreate={canCreateIssue}
        onCreate={() => {
          setCreateDefaults({
            sprint: view === "board" ? activeSprint?.id : null,
            status: null,
          });
          setCreateOpen(true);
        }}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenWp={(id) => setActiveTaskId(id)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        currentUser={currentUser}
      />
      <div
        className="sidebar-overlay"
        data-open={sidebarOpen ? "true" : "false"}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <Sidebar
        data-open={sidebarOpen ? "true" : "false"}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => {
          setCurrentProjectId(id);
          setSidebarOpen(false);
          toast.success(`Switched to ${PROJECTS.find((p) => p.id === id)?.name}`);
        }}
        currentView={view}
        onSelectView={setView}
      />
      <div className="row-start-2 row-end-3 col-start-2 col-end-3 overflow-hidden flex flex-col bg-surface-app">
        {view === "overview" ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Dashboard
              currentUser={currentUser}
              project={project}
              activeSprint={activeSprint}
              sprints={sprintsList}
              statuses={statusesQ.data || []}
              onSelectProject={(id) => {
                setCurrentProjectId(id);
                setView("board");
              }}
              onTaskClick={setActiveTaskId}
              onChangeView={setView}
              tasks={tasks}
            />
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-border px-6 pt-3.5 pb-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-fg-subtle mb-1.5">
                {project && (
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm mr-1"
                    style={{ background: project.color }}
                  />
                )}
                <button
                  type="button"
                  className="bg-transparent border-0 p-0 text-fg-subtle cursor-pointer hover:text-fg hover:underline"
                  onClick={() => setView("overview")}
                >
                  Projects
                </button>
                <span className="text-fg-faint">/</span>
                <span className="text-fg">{project?.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg m-0">
                  {pageTitle}
                </h1>
                {view === "board" && activeSprint?.days && activeSprint?.dayIn != null && (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle">
                    <Icon name="clock" size={13} aria-hidden="true" />
                    Day {activeSprint.dayIn} of {activeSprint.days} ·{" "}
                    {Math.max(0, activeSprint.days - activeSprint.dayIn)} days left
                  </span>
                )}
                {view === "board" && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) =>
                        setFilterMenu({
                          kind: "board-sprint",
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-white text-[13px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong transition-colors"
                      title="Switch the sprint shown on the board"
                    >
                      <Icon name="sprint" size={13} aria-hidden="true" />
                      <span className="truncate max-w-40">
                        {boardFilters.sprint === "all"
                          ? "All sprints"
                          : boardFilters.sprint === "backlog"
                          ? "Backlog only"
                          : sprintsList
                              .find((s) => s.id === boardFilters.sprint)
                              ?.name?.split(" — ")[0] || "Sprint"}
                      </span>
                      <Icon name="chev-down" size={12} aria-hidden="true" />
                    </button>
                    <SprintActionsRow
                      sprint={activeSprint}
                      manageVersions={manageVersions}
                      onStart={(sp) => setStartSprintFor(sp)}
                      onComplete={(sp) => setCompleteSprintFor(sp)}
                      onCreate={() => setCreateSprintOpen(true)}
                      onEdit={(sp) => setEditSprintFor(sp)}
                      onDelete={(sp) => setDeleteSprintFor(sp)}
                    />
                  </div>
                )}
              </div>
            </div>

            {view === "backlog" && (
              <div className="bg-white border-b border-border px-6 py-3 flex items-center gap-2 flex-wrap shrink-0">
                <div className="relative">
                  <Icon
                    name="search"
                    size={13}
                    className="absolute left-2 top-2 text-fg-faint pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    placeholder="Search…"
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    className="w-50 h-7 pl-7 pr-2 rounded-md border border-border bg-white text-xs text-fg outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]"
                    style={{ width: 200 }}
                  />
                </div>

                {[
                  {
                    kind: "epic",
                    active: filters.epic !== "all",
                    label:
                      filters.epic === "all"
                        ? "Epic"
                        : epicsList.find((e) => e.id === filters.epic)?.title || "Epic",
                  },
                  {
                    kind: "type",
                    active: filters.type !== "all",
                    label:
                      filters.type === "all"
                        ? "Type"
                        : (typesQ.data || []).find((t) => t.bucket === filters.type)?.name ||
                          filters.type,
                  },
                  {
                    kind: "label",
                    active: filters.label !== "all",
                    label: filters.label === "all" ? "Tag" : filters.label,
                  },
                  {
                    kind: "sprint",
                    active: filters.sprint !== "all",
                    label:
                      filters.sprint === "all"
                        ? "Sprint"
                        : filters.sprint === "backlog"
                        ? "Backlog only"
                        : sprintsList.find((s) => s.id === filters.sprint)?.name?.split(" — ")[0] ||
                          "Sprint",
                  },
                ].map((chip) => (
                  <button
                    key={chip.kind}
                    type="button"
                    onClick={(e) =>
                      setFilterMenu({
                        kind: chip.kind,
                        rect: e.currentTarget.getBoundingClientRect(),
                      })
                    }
                    className={[
                      "inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-xs font-medium cursor-pointer transition-colors",
                      chip.active
                        ? "bg-accent-50 border-accent-200 text-accent-700"
                        : "bg-white border-border text-fg-muted hover:bg-surface-subtle hover:border-border-strong",
                    ].join(" ")}
                  >
                    {chip.label}
                    <Icon name="chev-down" size={12} aria-hidden="true" />
                  </button>
                ))}

                {(filters.epic !== "all" ||
                  filters.type !== "all" ||
                  filters.label !== "all" ||
                  filters.sprint !== "all" ||
                  filters.q) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-transparent bg-transparent text-xs text-fg-muted hover:bg-surface-subtle"
                    onClick={() =>
                      setFilters({
                        assignee: "all",
                        epic: "all",
                        type: "all",
                        label: "all",
                        sprint: "all",
                        q: "",
                      })
                    }
                  >
                    Clear filters
                  </button>
                )}
                <div className="flex-1" />
                {view === "board" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-border bg-white text-xs text-fg font-medium transition-colors hover:bg-surface-subtle hover:border-border-strong"
                    onClick={(e) =>
                      setFilterMenu({
                        kind: "groupby",
                        rect: e.currentTarget.getBoundingClientRect(),
                      })
                    }
                  >
                    <Icon name="sort" size={13} aria-hidden="true" /> Group: {groupBy}
                  </button>
                )}
                {view === "board" && activeSprint?.goal && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle mr-2 max-w-xs">
                    <Icon name="flag" size={13} aria-hidden="true" />
                    <span className="text-fg-muted truncate">{activeSprint.goal}</span>
                  </span>
                )}
                {/* Page-level "Create sprint" — sits once in the backlog
                    page header instead of repeating per section. Hidden
                    when the user can't manage versions. */}
                {view === "backlog" && manageVersions.allowed && (
                  <button
                    type="button"
                    onClick={() => setCreateSprintOpen(true)}
                    disabled={manageVersions.loading}
                    className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-border bg-white text-xs text-fg font-medium transition-colors hover:bg-surface-subtle hover:border-border-strong disabled:opacity-50"
                    title={manageVersions.loading ? "Checking permissions…" : "Create sprint"}
                  >
                    <Icon name="sprint" size={13} aria-hidden="true" />
                    Create sprint
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-accent bg-accent text-white text-xs font-medium transition-colors hover:bg-accent-600 hover:border-accent-600 shadow-[0_1px_0_rgba(15,23,41,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  onClick={() => {
                    setCreateDefaults({
                      sprint: view === "board" ? activeSprint?.id : null,
                      status: null,
                    });
                    setCreateOpen(true);
                  }}
                >
                  <Icon name="plus" size={13} aria-hidden="true" /> Create
                </button>
              </div>
            )}

            {filterMenu?.kind === "epic" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) => setFilters({ ...filters, epic: it.value })}
                items={[
                  { label: "All epics", value: "all", active: filters.epic === "all" },
                  { divider: true },
                  ...epicsList.map((e) => ({
                    label: e.title,
                    value: e.id,
                    swatch: e.color,
                    active: filters.epic === e.id,
                  })),
                ]}
              />
            )}
            {filterMenu?.kind === "type" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) => setFilters({ ...filters, type: it.value })}
                items={[
                  { label: "All types", value: "all", active: filters.type === "all" },
                  { divider: true },
                  ...(typesQ.data || []).map((t) => ({
                    label: t.name,
                    value: t.bucket,
                    active: filters.type === t.bucket,
                  })),
                ]}
              />
            )}
            {filterMenu?.kind === "label" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) => setFilters({ ...filters, label: it.value })}
                items={[
                  { label: "All tags", value: "all", active: filters.label === "all" },
                  { divider: true },
                  ...(labelOptions.length > 0
                    ? labelOptions
                    : [{ label: "(no tags in this project)", value: "all", disabled: true }]),
                ]}
              />
            )}
            {filterMenu?.kind === "sprint" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) => setFilters({ ...filters, sprint: it.value })}
                items={[
                  { label: "All sprints (default)", value: "all", active: filters.sprint === "all" },
                  { label: "Backlog only", value: "backlog", active: filters.sprint === "backlog" },
                  { divider: true },
                  ...sprintsList.map((s) => ({
                    label: s.name,
                    value: s.id,
                    active: filters.sprint === s.id,
                  })),
                ]}
              />
            )}
            {filterMenu?.kind === "board-sprint" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) =>
                  setBoardFilters((f) => ({ ...f, sprint: it.value }))
                }
                items={[
                  {
                    label: "All sprints",
                    value: "all",
                    active: boardFilters.sprint === "all",
                  },
                  {
                    label: "Backlog only",
                    value: "backlog",
                    active: boardFilters.sprint === "backlog",
                  },
                  { divider: true },
                  ...sprintsList.map((s) => ({
                    label: s.name?.split(" — ")[0] || s.name,
                    value: s.id,
                    active: boardFilters.sprint === s.id,
                  })),
                ]}
              />
            )}
            {filterMenu?.kind === "groupby" && (
              <Menu
                anchorRect={filterMenu.rect}
                onClose={() => setFilterMenu(null)}
                onSelect={(it) => setGroupBy(it.value)}
                items={[
                  { label: "Status (default)", value: "status", active: groupBy === "status" },
                  { label: "Assignee", value: "assignee", active: groupBy === "assignee" },
                  { label: "Epic", value: "epic", active: groupBy === "epic" },
                ]}
              />
            )}

            <div
              className="flex-1 px-6 py-4"
              style={{ overflow: view === "board" ? "hidden" : "auto" }}
            >
              {tasksQ.isLoading ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <LoadingPill label="loading work packages" />
                </div>
              ) : tasksQ.error ? (
                <div style={{ padding: 24, color: "var(--pri-highest)" }}>
                  {String(tasksQ.error.message)}
                </div>
              ) : (
                <>
                  {view === "board" && (
                    <Board
                      tasks={filteredTasks}
                      statuses={statusesQ.data || []}
                      assignees={assigneesQ.data || []}
                      canCreate={canCreateIssue}
                      onTaskClick={setActiveTaskId}
                      onMoveTask={moveTaskByStatusId}
                      onCreateInColumn={(statusId) => {
                        const target = (statusesQ.data || []).find(
                          (s) => String(s.id) === String(statusId),
                        );
                        setCreateDefaults({
                          sprint: activeSprint?.id || null,
                          status: target?.bucket || null,
                          statusId,
                        });
                        setCreateOpen(true);
                      }}
                    />
                  )}
                  {view === "backlog" && (
                    <Backlog
                      tasks={filteredTasks}
                      statuses={statusesQ.data || []}
                      sprints={sprintsList}
                      assignees={assigneesQ.data || []}
                      manageVersions={manageVersions}
                      canCreate={canCreateIssue}
                      currentUserId={currentUser?.id}
                      onTaskClick={setActiveTaskId}
                      onMoveTask={moveTaskSprint}
                      onStatusChange={moveTaskByStatusId}
                      onAssigneeChange={(id, a) => {
                        updateTask(id, { assignee: a });
                        toast.success("Assignee updated");
                      }}
                      onStartSprint={(sp) => setStartSprintFor(sp)}
                      onCompleteSprint={(sp) => setCompleteSprintFor(sp)}
                      onCreateSprint={() => setCreateSprintOpen(true)}
                      onEditSprint={(sp) => setEditSprintFor(sp)}
                      onDeleteSprint={(sp) => setDeleteSprintFor(sp)}
                      onSyncSprint={syncSprint}
                      onBulkMoveSprint={async (ids, sprintId) => {
                        const target = sprintId
                          ? sprintsList.find((s) => s.id === sprintId)?.name?.split(" — ")[0] ||
                            "sprint"
                          : "backlog";
                        const pending = toast.loading(
                          `Moving ${ids.length} ${ids.length === 1 ? "issue" : "issues"} to ${target}…`,
                        );
                        const { ok, gone, failed } = await runBatched(ids, () => ({
                          sprint: sprintId,
                        }));
                        toast.dismiss(pending);
                        if (failed > 0) {
                          toast.error(
                            `Moved ${ok + gone} of ${ids.length}. ${failed} failed — see OpenProject.`,
                          );
                        } else {
                          toast.success(
                            `Moved ${ok + gone} ${ok + gone === 1 ? "issue" : "issues"} to ${target}`,
                          );
                        }
                      }}
                      onBulkAssign={async (ids, assigneeId) => {
                        const verb = assigneeId ? "Assigning" : "Unassigning";
                        const pending = toast.loading(
                          `${verb} ${ids.length} ${ids.length === 1 ? "issue" : "issues"}…`,
                        );
                        const { ok, gone, failed } = await runBatched(ids, () => ({
                          assignee: assigneeId,
                        }));
                        toast.dismiss(pending);
                        if (failed > 0) {
                          toast.error(
                            `Updated ${ok + gone} of ${ids.length}. ${failed} failed — see OpenProject.`,
                          );
                        } else {
                          toast.success(
                            assigneeId
                              ? `Assigned ${ok + gone} ${ok + gone === 1 ? "issue" : "issues"}`
                              : `Unassigned ${ok + gone} ${ok + gone === 1 ? "issue" : "issues"}`,
                          );
                        }
                      }}
                      onBulkDelete={(ids, clearSelection) => {
                        if (!ids?.length) return;
                        setBulkDeleteFor({ ids, clearSelection });
                      }}
                      onCreate={createIssue}
                    />
                  )}
                  {view === "tags" && (
                    <Tags
                      projectId={currentProjectId}
                      projectName={project?.name}
                      tasks={tasks}
                      onTaskClick={setActiveTaskId}
                      onFilter={(name) => {
                        setView("backlog");
                        setFiltersByView((prev) => ({
                          ...prev,
                          backlog: { ...(prev.backlog || DEFAULT_FILTERS), label: name },
                        }));
                      }}
                    />
                  )}
                  {view === "timeline" && (
                    <Timeline
                      tasks={filteredTasks}
                      sprints={sprintsList}
                      assignees={assigneesQ.data || []}
                      isLoading={tasksQ.isLoading}
                      onTaskClick={setActiveTaskId}
                    />
                  )}
                  {view === "reports" && activeSprint && (
                    <Reports sprint={activeSprint} tasks={filteredTasks} projectId={currentProjectId} />
                  )}
                  {view === "reports" && !activeSprint && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
                      Reports require an active sprint.
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {activeTaskId && (
        <TaskDetail
          taskId={activeTaskId}
          tasks={tasks}
          projectName={project?.name}
          projectId={currentProjectId}
          currentUser={currentUser}
          categories={categoriesQ.data || []}
          statuses={statusesQ.data || []}
          priorities={prioritiesQ.data || []}
          sprints={sprintsList}
          epics={epicsList}
          assignees={assigneesQ.data || []}
          onClose={() => setActiveTaskId(null)}
          onUpdate={updateTask}
          onChange={(msg) => toast.success(msg)}
          onSelectTask={(id) => setActiveTaskId(id)}
        />
      )}
      {createOpen && (
        <CreateTask
          onClose={() => setCreateOpen(false)}
          onCreate={createIssue}
          projectName={project?.name}
          defaultSprint={createDefaults.sprint}
          defaultStatus={createDefaults.status}
          categories={categoriesQ.data || []}
          types={typesQ.data || []}
          priorities={prioritiesQ.data || []}
          sprints={sprintsList}
          epics={epicsList}
          assignees={assigneesQ.data || []}
          tasks={tasks}
          currentUser={currentUser}
        />
      )}
      {startSprintFor && (
        <SprintModal
          sprint={startSprintFor}
          tasks={tasks}
          projectId={currentProjectId}
          onClose={() => setStartSprintFor(null)}
          onStarted={() => {
            setStartSprintFor(null);
            setView("board");
          }}
        />
      )}
      {completeSprintFor && (
        <CompleteSprintModal
          sprint={completeSprintFor}
          tasks={tasks}
          sprints={sprintsQ.data || []}
          projectId={currentProjectId}
          onClose={() => setCompleteSprintFor(null)}
        />
      )}
      {createSprintOpen && (
        <CreateSprintModal
          onClose={() => setCreateSprintOpen(false)}
          onCreate={createSprint}
        />
      )}
      {editSprintFor && (
        <EditSprintModal
          sprint={editSprintFor}
          projectId={currentProjectId}
          onClose={() => setEditSprintFor(null)}
        />
      )}
      {deleteSprintFor && (() => {
        const inSprintLocal = tasks.filter((t) => t.sprint === deleteSprintFor.id);
        return (
          <ConfirmModal
            title={`Delete ${deleteSprintFor.name?.split(" — ")[0] || "sprint"}?`}
            description={
              inSprintLocal.length > 0
                ? `This will permanently delete the sprint and all ${inSprintLocal.length} ${inSprintLocal.length === 1 ? "task" : "tasks"} inside it. This can't be undone.`
                : "This will permanently delete the sprint and any tasks attached to it. This can't be undone."
            }
            confirmLabel="Delete sprint"
            destructive
            busy={deletingSprint}
            onClose={() => !deletingSprint && setDeleteSprintFor(null)}
            onConfirm={async () => {
              setDeletingSprint(true);
              try {
                // Fetch the *canonical* version-scoped list at delete time
                // so closed/hidden WPs aren't missed. OP refuses to delete
                // a version that still has work packages attached, so this
                // is the authoritative source.
                let list = [];
                try {
                  const scoped = await fetchJson(
                    `/api/openproject/tasks?project=${encodeURIComponent(currentProjectId)}&sprint=${encodeURIComponent(deleteSprintFor.id)}`,
                  );
                  if (Array.isArray(scoped)) list = scoped;
                } catch {
                  // If the list fetch fails, still attempt to delete the
                  // version — OP will tell us if it can't.
                }

                // Delete WPs concurrently in small batches. With hundreds of
                // closed WPs, sequential deletion takes minutes; batching
                // keeps things snappy without flooding OP.
                let deleted = 0;
                let alreadyGone = 0;
                let failed = 0;
                const BATCH = 8;
                for (let i = 0; i < list.length; i += BATCH) {
                  const slice = list.slice(i, i + BATCH);
                  await Promise.all(
                    slice.map(async (t) => {
                      try {
                        await deleteTaskMutation.mutateAsync(t.id);
                        deleted += 1;
                      } catch (err) {
                        // 404 = the WP was already gone (cascade-deleted by
                        // a parent we just removed, or someone else got
                        // there first). Treat as success.
                        if (err?.status === 404) alreadyGone += 1;
                        else failed += 1;
                      }
                    }),
                  );
                }

                if (failed > 0) {
                  toast.error(
                    `Couldn't delete ${failed} ${failed === 1 ? "task" : "tasks"} in this sprint — fix in OpenProject and retry.`,
                  );
                  return;
                }

                try {
                  await deleteVersionMutation.mutateAsync(deleteSprintFor.id);
                } catch (err) {
                  // 404 = the version was removed as a side-effect of WP
                  // deletes (some OP plugins do that). Still a success.
                  if (err?.status !== 404) throw err;
                }
                const removed = deleted + alreadyGone;
                toast.success(
                  removed > 0
                    ? `Sprint and ${removed} ${removed === 1 ? "task" : "tasks"} deleted`
                    : "Sprint deleted",
                );
                setDeleteSprintFor(null);
              } catch (e) {
                toast.error(friendlyError(e, "Couldn't delete sprint — please try again."));
              } finally {
                setDeletingSprint(false);
              }
            }}
          />
        );
      })()}

      {/* Bulk delete work packages — confirms, then concurrently
          batches DELETEs (8 at a time) so hundreds of WPs go in seconds.
          404s are treated as success (the row is already gone, possibly
          cascade-deleted by a parent we removed in the same run). */}
      {bulkDeleteFor && (
        <ConfirmModal
          title={`Delete ${bulkDeleteFor.ids.length} work ${bulkDeleteFor.ids.length === 1 ? "package" : "packages"}?`}
          description="This permanently removes the selected work packages and any sub-tasks attached to them. This can't be undone."
          confirmLabel={`Delete ${bulkDeleteFor.ids.length}`}
          destructive
          busy={bulkDeleting}
          onClose={() => !bulkDeleting && setBulkDeleteFor(null)}
          onConfirm={async () => {
            const { ids, clearSelection } = bulkDeleteFor;
            setBulkDeleting(true);
            const pending = toast.loading(
              `Deleting ${ids.length} work ${ids.length === 1 ? "package" : "packages"}…`,
            );
            let deleted = 0;
            let alreadyGone = 0;
            let failed = 0;
            const BATCH = 8;
            for (let i = 0; i < ids.length; i += BATCH) {
              const slice = ids.slice(i, i + BATCH);
              await Promise.all(
                slice.map(async (id) => {
                  try {
                    await deleteTaskMutation.mutateAsync(id);
                    deleted += 1;
                  } catch (err) {
                    if (err?.status === 404) alreadyGone += 1;
                    else failed += 1;
                  }
                }),
              );
            }
            toast.dismiss(pending);
            const ok = deleted + alreadyGone;
            if (failed > 0) {
              toast.error(
                `Deleted ${ok} of ${ids.length}. ${failed} failed — check OpenProject permissions.`,
              );
            } else {
              toast.success(
                `${ok} work ${ok === 1 ? "package" : "packages"} deleted`,
              );
            }
            clearSelection?.();
            setBulkDeleteFor(null);
            setBulkDeleting(false);
          }}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenWp={(id) => setActiveTaskId(id)}
        onSwitchProject={(id) => setCurrentProjectId(id)}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            swatches={Object.keys(ACCENTS)}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfy" },
            ]}
          />
          <TweakRadio
            label="Sidebar"
            value={tweaks.sidebarStyle}
            onChange={(v) => setTweak("sidebarStyle", v)}
            options={[
              { value: "wide", label: "Wide" },
              { value: "rail", label: "Rail" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

