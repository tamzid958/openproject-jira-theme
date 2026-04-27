"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Board } from "@/components/board";
import { BoardList } from "@/components/board-list";
import { BoardSwimlanes } from "@/components/board-swimlanes";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import { Menu } from "@/components/ui/menu";
import {
  useAvailableAssignees,
  useCategories,
} from "@/lib/hooks/use-openproject-detail";
import {
  useApiStatus,
  useSprints,
  useStatuses,
  useTasks,
  useTypes,
  useUpdateTask,
} from "@/lib/hooks/use-openproject";
import { useUrlParams } from "@/lib/hooks/use-modal-url";
import { pickSprintByDate } from "@/lib/hooks/use-active-sprint";

export default function BoardPage({ params: paramsPromise }) {
  const { projectId } = use(paramsPromise);
  const { params: urlParams, setParams } = useUrlParams();
  const sprintFilter = urlParams.get("s") || "all";
  const viewParam = urlParams.get("view");
  const view =
    viewParam === "list" || viewParam === "swimlanes" ? viewParam : "kanban";

  const filters = useMemo(
    () => ({
      q: urlParams.get("q") || "",
      assignee: urlParams.get("assignee") || "all",
      type: urlParams.get("type") || "all",
      label: urlParams.get("label") || "all",
    }),
    [urlParams],
  );
  const setFilter = (k, v) => setParams({ [k]: v && v !== "all" ? v : null });

  const status = useApiStatus();
  const configured = status.data?.configured === true;
  const sprintsQ = useSprints(projectId, configured && !!projectId);
  const statusesQ = useStatuses(configured);
  const typesQ = useTypes(projectId, configured && !!projectId);
  const categoriesQ = useCategories(projectId, configured && !!projectId);
  const assigneesQ = useAvailableAssignees(projectId, configured && !!projectId);
  const updateTaskMutation = useUpdateTask(projectId);

  const sprintsList = sprintsQ.data || [];

  // Stale-sprint guard: if the URL points at a sprint the project no longer
  // has, reset to "all" so the chip + URL stop pointing at a ghost. Gated
  // on isSuccess so we don't reset during loading.
  useEffect(() => {
    if (!sprintsQ.isSuccess) return;
    if (!sprintFilter || sprintFilter === "all" || sprintFilter === "backlog") return;
    if (!sprintsList.some((s) => s.id === sprintFilter)) {
      setParams({ s: null });
    }
  }, [sprintsQ.isSuccess, sprintsList, sprintFilter, setParams]);

  // First-visit default: when no `?s=` is set, pick a sprint by date and
  // pin it to the URL. Stored per-project in localStorage so the user's
  // last-picked sprint sticks.
  useEffect(() => {
    if (!sprintsQ.isSuccess) return;
    if (urlParams.has("s")) return;
    let saved = null;
    try {
      saved = window.localStorage.getItem(`op:board-sprint:${projectId}`);
    } catch {
      // localStorage unavailable.
    }
    let pick = null;
    if (saved && (saved === "backlog" || sprintsList.some((s) => s.id === saved))) {
      pick = saved;
    } else {
      const dated = pickSprintByDate(sprintsList);
      pick = dated?.id || null;
    }
    if (pick) setParams({ s: pick });
  }, [sprintsQ.isSuccess, sprintsList, projectId, urlParams, setParams]);

  // Persist board sprint per-project so a hard refresh restores it.
  useEffect(() => {
    if (typeof window === "undefined" || !projectId) return;
    try {
      const key = `op:board-sprint:${projectId}`;
      if (sprintFilter && sprintFilter !== "all") {
        window.localStorage.setItem(key, sprintFilter);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore quota / privacy-mode errors.
    }
  }, [projectId, sprintFilter]);

  // Same per-project persistence for the view toggle (kanban / list).
  // Rehydration must run only ONCE per projectId mount, otherwise
  // toggling Kanban → drop `?view=` → effect refires → reads stale
  // localStorage → snaps right back to list. The ref tracks which
  // project we've already rehydrated for so subsequent URL changes
  // (search input, filter chips, toggle clicks) don't trigger a
  // re-read of saved state. The persist effect below still keeps
  // localStorage in sync when the user actively flips the toggle.
  const rehydratedViewFor = useRef(null);
  useEffect(() => {
    if (!projectId) return;
    if (rehydratedViewFor.current === projectId) return;
    rehydratedViewFor.current = projectId;
    if (urlParams.has("view")) return;
    let saved = null;
    try {
      saved = window.localStorage.getItem(`op:board-view:${projectId}`);
    } catch {
      // localStorage unavailable.
    }
    if (saved === "list" || saved === "swimlanes") setParams({ view: saved });
  }, [projectId, urlParams, setParams]);

  useEffect(() => {
    if (typeof window === "undefined" || !projectId) return;
    try {
      const key = `op:board-view:${projectId}`;
      if (view === "list" || view === "swimlanes") {
        window.localStorage.setItem(key, view);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore quota / privacy-mode errors.
    }
  }, [projectId, view]);

  const sprintScope =
    sprintFilter === "all" ? null : sprintFilter === "backlog" ? "backlog" : sprintFilter;
  const tasksQ = useTasks(projectId, sprintScope, configured && !!projectId);
  const tasks = tasksQ.data || [];

  // Apply chip + search filters client-side. The sprint filter is already
  // applied server-side via `?sprint=`; everything else is local.
  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (filters.assignee !== "all" && t.assignee !== filters.assignee) return false;
        if (filters.type !== "all" && t.type !== filters.type) return false;
        if (filters.label !== "all" && !(t.labels || []).includes(filters.label)) return false;
        if (filters.q) {
          const q = filters.q.toLowerCase();
          if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [tasks, filters],
  );

  const activeSprint = useMemo(() => {
    if (sprintFilter && sprintFilter !== "all" && sprintFilter !== "backlog") {
      const match = sprintsList.find((s) => s.id === sprintFilter);
      if (match) return match;
    }
    return pickSprintByDate(sprintsList);
  }, [sprintsList, sprintFilter]);

  const [sprintMenu, setSprintMenu] = useState(null);
  const [filterMenu, setFilterMenu] = useState(null);

  const labelOptions = (categoriesQ.data || []).map((c) => ({
    label: c.name,
    value: c.name,
    active: filters.label === c.name,
  }));
  const hasActiveFilters =
    filters.assignee !== "all" ||
    filters.type !== "all" ||
    filters.label !== "all" ||
    filters.q;

  const sprintLabel =
    sprintFilter === "all"
      ? "All sprints"
      : sprintFilter === "backlog"
      ? "Backlog only"
      : sprintsList.find((s) => s.id === sprintFilter)?.name?.split(" — ")[0] || "Sprint";

  const pageTitle = activeSprint
    ? `${activeSprint.name.split(" — ")[0]} board`
    : "Board";

  const moveTaskByStatusId = (id, statusId) => {
    const t = tasks.find((x) => x.id === id);
    const target = (statusesQ.data || []).find(
      (s) => String(s.id) === String(statusId),
    );
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

  // Generic patch passthrough used by the list view for re-parenting
  // (drag a row under another parent) and any other field-level patch
  // a row might issue. Mappers convert `parent` to the HAL link.
  const updateTask = (id, patch) => {
    updateTaskMutation.mutate({ id, patch });
  };

  return (
    <>
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
            {pageTitle}
          </h1>
          {activeSprint?.days && activeSprint?.dayIn != null && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle">
              <Icon name="clock" size={13} aria-hidden="true" />
              Day {activeSprint.dayIn} of {activeSprint.days} ·{" "}
              {Math.max(0, activeSprint.days - activeSprint.dayIn)} days left
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) =>
                setSprintMenu({ rect: e.currentTarget.getBoundingClientRect() })
              }
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface-elevated text-[13px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong transition-colors"
              title="Switch the sprint shown on the board"
            >
              <Icon name="sprint" size={13} aria-hidden="true" />
              <span className="truncate max-w-40">{sprintLabel}</span>
              <Icon name="chev-down" size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar — same chip pattern as Backlog so the two views feel
          consistent. Search + assignee + type + tag chips, all driven by
          URL search params so links are shareable. */}
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 py-3 flex items-center gap-2 flex-wrap shrink-0">
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
            onChange={(e) => setFilter("q", e.target.value)}
            className="h-7 pl-7 pr-2 rounded-md border border-border bg-surface-elevated text-xs text-fg outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)] w-[140px] sm:w-[200px]"
          />
        </div>
        {[
          {
            kind: "assignee",
            active: filters.assignee !== "all",
            label:
              filters.assignee === "all"
                ? "Assignee"
                : (assigneesQ.data || []).find((u) => String(u.id) === String(filters.assignee))
                    ?.name || "Assignee",
          },
          {
            kind: "type",
            active: filters.type !== "all",
            label:
              filters.type === "all"
                ? "Type"
                : (typesQ.data || []).find((t) => t.bucket === filters.type)?.name || filters.type,
          },
          {
            kind: "label",
            active: filters.label !== "all",
            label: filters.label === "all" ? "Tag" : filters.label,
          },
        ].map((chip) => (
          <button
            key={chip.kind}
            type="button"
            onClick={(e) =>
              setFilterMenu({ kind: chip.kind, rect: e.currentTarget.getBoundingClientRect() })
            }
            className={[
              "inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-xs font-medium cursor-pointer transition-colors",
              chip.active
                ? "bg-accent-50 border-accent-200 text-accent-700"
                : "bg-surface-elevated border-border text-fg-muted hover:bg-surface-subtle hover:border-border-strong",
            ].join(" ")}
          >
            {chip.label}
            <Icon name="chev-down" size={12} aria-hidden="true" />
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-transparent bg-transparent text-xs text-fg-muted hover:bg-surface-subtle"
            onClick={() => setParams({ q: null, assignee: null, type: null, label: null })}
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto inline-flex h-7 rounded-md border border-border-soft bg-surface-elevated p-0.5 overflow-hidden">
          {[
            { id: "kanban", label: "Kanban", icon: "board" },
            { id: "list", label: "List", icon: "list" },
            { id: "swimlanes", label: "Swimlanes", icon: "people" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setParams({ view: opt.id === "kanban" ? null : opt.id })}
              className={[
                "inline-flex items-center gap-1.5 h-6 px-2.5 rounded text-[12px] font-medium cursor-pointer transition-colors",
                view === opt.id
                  ? "bg-surface-subtle text-fg"
                  : "bg-transparent text-fg-muted hover:text-fg",
              ].join(" ")}
              aria-pressed={view === opt.id}
              title={`Switch to ${opt.label.toLowerCase()} view`}
            >
              <Icon name={opt.icon} size={12} aria-hidden="true" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filterMenu?.kind === "assignee" && (
        <Menu
          anchorRect={filterMenu.rect}
          onClose={() => setFilterMenu(null)}
          searchable
          searchPlaceholder="Search people…"
          width={240}
          onSelect={(it) => setFilter("assignee", it.value)}
          items={[
            { label: "All assignees", value: "all", active: filters.assignee === "all" },
            { divider: true },
            ...(assigneesQ.data || []).map((p) => ({
              label: p.name,
              value: p.id,
              avatar: p,
              active: String(p.id) === String(filters.assignee),
            })),
          ]}
        />
      )}
      {filterMenu?.kind === "type" && (
        <Menu
          anchorRect={filterMenu.rect}
          onClose={() => setFilterMenu(null)}
          onSelect={(it) => setFilter("type", it.value)}
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
          onSelect={(it) => setFilter("label", it.value)}
          items={[
            { label: "All tags", value: "all", active: filters.label === "all" },
            { divider: true },
            ...(labelOptions.length > 0
              ? labelOptions
              : [{ label: "(no tags in this project)", value: "all", disabled: true }]),
          ]}
        />
      )}

      {sprintMenu && (
        <Menu
          anchorRect={sprintMenu.rect}
          onClose={() => setSprintMenu(null)}
          onSelect={(it) => setParams({ s: it.value === "all" ? null : it.value })}
          items={[
            { label: "All sprints", value: "all", active: sprintFilter === "all" },
            {
              label: "Backlog only",
              value: "backlog",
              active: sprintFilter === "backlog",
            },
            { divider: true },
            ...sprintsList.map((s) => ({
              label: s.name?.split(" — ")[0] || s.name,
              value: s.id,
              active: sprintFilter === s.id,
            })),
          ]}
        />
      )}

      <div
        className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 ${
          view === "kanban" ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {tasksQ.isLoading ? (
          <div className="p-10 text-center">
            <LoadingPill label="loading work packages" />
          </div>
        ) : tasksQ.error ? (
          <div className="p-6 text-pri-highest">
            {String(tasksQ.error.message)}
          </div>
        ) : view === "list" ? (
          <BoardList
            tasks={filteredTasks}
            statuses={statusesQ.data || []}
            onTaskClick={(id) => setParams({ wp: id })}
            onMoveTask={moveTaskByStatusId}
            onUpdate={updateTask}
          />
        ) : view === "swimlanes" ? (
          <BoardSwimlanes
            tasks={filteredTasks}
            statuses={statusesQ.data || []}
            assignees={assigneesQ.data || []}
            onTaskClick={(id) => setParams({ wp: id })}
            onUpdate={updateTask}
          />
        ) : (
          <Board
            tasks={filteredTasks}
            statuses={statusesQ.data || []}
            assignees={assigneesQ.data || []}
            onTaskClick={(id) => setParams({ wp: id })}
            onMoveTask={moveTaskByStatusId}
            onCreateInColumn={(statusId) => {
              const target = (statusesQ.data || []).find(
                (s) => String(s.id) === String(statusId),
              );
              setParams({
                create: "1",
                createSprint: activeSprint?.id || null,
                createStatus: target?.bucket || null,
              });
            }}
          />
        )}
      </div>
    </>
  );
}
