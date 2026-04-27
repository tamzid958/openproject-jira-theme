"use client";

import { Fragment, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Menu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { TagPill } from "@/components/ui/tag-pill";
import { Icon, PriorityIcon, TypeIcon } from "@/components/icons";
import { formatPoints } from "@/lib/openproject/story-points-constants";
import { PEOPLE } from "@/lib/data";
import { cn } from "@/lib/utils";
import { buildChildIndex, rootsOf } from "@/lib/openproject/hierarchy";
import { assigneeMenuItems, statusMenuItems } from "@/lib/openproject/menu-items";

// Backlog row column layout. Each column has a deliberate width so the
// table reads cleanly on every screen width:
//   1. checkbox          18px
//   2. grip / chevron    18px
//   3. type icon         18px
//   4. title (key+title+tags)  240–480px, ellipses long titles
//   5. status pill       128px (fits "IN REVIEW")
//   6. priority icon     20px
//   7. points pill       48px
//   8. sprint name       110–180px
//   9. assignee avatar   28px
// Responsive grid template lives in globals.css under `.backlog-row` —
// on phones the row collapses to 5 columns (checkbox, expand, title,
// status, assignee) and the desktop-only cells get tagged with
// `.backlog-cell-md` so they `display: none` until ≥md.
const ROW_GRID = "backlog-row";
const HEADER_GRID = "backlog-row";
function Checkbox({ checked, onChange, label }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange?.(!checked);
        }
      }}
      className={cn(
        "inline-grid place-items-center w-4 h-4 rounded border-[1.5px] transition-colors cursor-pointer",
        checked
          ? "bg-accent border-accent text-on-accent"
          : "bg-surface-elevated border-border-strong hover:border-accent",
      )}
    >
      {checked && <Icon name="check" size={11} aria-hidden="true" />}
    </span>
  );
}

function BacklogRow({
  task,
  statuses,
  assignees,
  selected,
  depth = 0,
  hasChildren = false,
  expanded = false,
  onToggle,
  onSelectChange,
  onClick,
  onStatusChange,
  onAssigneeChange,
}) {
  const assigneeList = Array.isArray(assignees) ? assignees : [];
  const assignee =
    assigneeList.find((u) => String(u.id) === String(task.assignee)) ||
    (task.assignee
      ? { id: task.assignee, name: task.assigneeName || "Assignee" }
      : null);
  const [statusMenu, setStatusMenu] = useState(null);
  const [assignMenu, setAssignMenu] = useState(null);
  const editable = task.permissions?.update !== false;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !editable,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(editable ? listeners : {})}
      className={cn(
        ROW_GRID,
        "px-3 py-1.5 border-b border-border-soft cursor-pointer transition-colors hover:bg-surface-subtle",
        isDragging && "opacity-50 cursor-grabbing",
        task.status === "done" && "opacity-70",
        selected && "bg-accent-50/40",
      )}
      style={depth > 0 ? { paddingLeft: 12 + depth * 20 } : undefined}
      onClick={() => onClick(task.id)}
      aria-disabled={!editable || undefined}
    >
      <Checkbox
        checked={selected}
        onChange={(v) => onSelectChange?.(task.id, v)}
        label={`Select ${task.key}`}
      />
      {hasChildren ? (
        <span
          role="button"
          data-inline-tap
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="relative grid place-items-center w-4 h-4 rounded text-fg-subtle cursor-pointer hover:bg-surface-muted hover:text-fg before:content-[''] before:absolute before:-inset-2"
        >
          <Icon
            name={expanded ? "chev-down" : "chev-right"}
            size={12}
            aria-hidden="true"
          />
        </span>
      ) : (
        <span
          onClick={(e) => e.stopPropagation()}
          aria-hidden="true"
          className={cn(
            "text-border-strong cursor-grab opacity-50 hover:opacity-100 transition-opacity",
            !editable && "invisible",
          )}
        >
          <Icon name="grip" size={14} />
        </span>
      )}
      <span className="backlog-cell-md">
        <TypeIcon type={task.type} size={14} />
      </span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[11px] text-fg-subtle shrink-0">{task.key}</span>
        <span
          title={task.title}
          className={cn(
            "flex-1 min-w-0 truncate text-[13px]",
            task.status === "done" ? "text-fg-subtle line-through" : "text-fg",
          )}
        >
          {task.title}
        </span>
        {task.labels && task.labels.length > 0 && (
          <span className="hidden md:flex items-center gap-1 shrink-0">
            {task.labels.slice(0, 2).map((l) => (
              <TagPill key={l} name={l} size="xs" />
            ))}
            {task.labels.length > 2 && (
              <span className="text-[10px] text-fg-subtle font-medium">
                +{task.labels.length - 2}
              </span>
            )}
          </span>
        )}
      </span>
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setStatusMenu(e.currentTarget.getBoundingClientRect());
        }}
        className={cn(editable ? "cursor-pointer" : "cursor-default")}
        aria-disabled={!editable || undefined}
      >
        <StatusPill status={task.status} name={task.statusName} />
      </span>
      <span className="backlog-cell-md justify-self-center">
        <PriorityIcon priority={task.priority} size={14} />
      </span>
      <span
        title={`${task.points || 0} story points`}
        className="backlog-cell-md justify-self-center px-2 py-0.5 rounded-full bg-surface-muted text-[11px] font-medium text-fg-muted text-center min-w-9"
      >
        {formatPoints(task) ?? "—"}
      </span>
      <span
        className="backlog-cell-md text-xs text-fg-subtle truncate"
        title={task.sprintName || ""}
      >
        {task.sprintName ? task.sprintName.split(" — ")[0] : "—"}
      </span>
      <span
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          setAssignMenu(e.currentTarget.getBoundingClientRect());
        }}
        className={cn(
          editable ? "cursor-pointer" : "cursor-default",
          "justify-self-center",
        )}
        aria-disabled={!editable || undefined}
        title={assignee?.name || task.assigneeName || "Unassigned"}
      >
        <Avatar user={assignee} size="sm" />
      </span>

      {statusMenu && (
        <Menu
          anchorRect={statusMenu}
          onClose={() => setStatusMenu(null)}
          onSelect={(it) => onStatusChange(task.id, it.value)}
          items={statusMenuItems(statuses, task.statusId)}
        />
      )}
      {assignMenu && (
        <Menu
          anchorRect={assignMenu}
          onClose={() => setAssignMenu(null)}
          onSelect={(it) => onAssigneeChange(task.id, it.value)}
          searchable
          searchPlaceholder="Search people…"
          width={240}
          items={assigneeMenuItems(task.assignee, assigneeList)}
        />
      )}
    </div>
  );
}

// OP exposes three native version statuses (open / locked / closed). The
// pill lets users see at a glance which sprints are still editable, which
// are running but locked from edits, and which are archived.
const SPRINT_STATUS_STYLE = {
  open: {
    label: "Open",
    cls: "bg-status-todo-bg text-status-todo-fg",
    title: "Open — accepting changes",
  },
  locked: {
    label: "Locked",
    cls: "bg-status-progress-bg text-status-progress-fg",
    title: "Locked — running, no edits allowed",
  },
  closed: {
    label: "Closed",
    cls: "bg-surface-muted text-fg-subtle",
    title: "Closed — archived",
  },
};

function SprintStatusPill({ status }) {
  const meta = SPRINT_STATUS_STYLE[status];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${meta.cls}`}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

function BacklogTreeRow({
  task,
  depth,
  childIndex,
  expandedSet,
  toggle,
  selectedSet,
  rowProps,
}) {
  const children = childIndex.get(String(task.nativeId)) || [];
  const isOpen = expandedSet.has(task.id);
  return (
    <Fragment>
      <BacklogRow
        {...rowProps}
        task={task}
        selected={selectedSet.has(task.id)}
        depth={depth}
        hasChildren={children.length > 0}
        expanded={isOpen}
        onToggle={() => toggle(task.id)}
      />
      {isOpen &&
        children.map((c) => (
          <BacklogTreeRow
            key={c.id}
            task={c}
            depth={depth + 1}
            childIndex={childIndex}
            expandedSet={expandedSet}
            toggle={toggle}
            selectedSet={selectedSet}
            rowProps={rowProps}
          />
        ))}
    </Fragment>
  );
}

function BacklogSection({
  title,
  sub,
  tasks,
  sprint,
  isSprint,
  isOver,
  statuses,
  assignees,
  manageVersions,
  canCreate,
  selected,
  onSelectChange,
  onSelectAll,
  onTaskClick,
  onStatusChange,
  onAssigneeChange,
  onStartSprint,
  onCompleteSprint,
  onCreateSprint,
  onEditSprint,
  onDeleteSprint,
  onSyncSprint,
  onExportJson,
  onSetVersionStatus,
  onCreate,
}) {
  const [syncing, setSyncing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedSet, setExpandedSet] = useState(() => new Set());
  const [sprintMenu, setSprintMenu] = useState(null);
  // Build the kebab in three groups (lifecycle / management / destructive)
  // separated by dividers; each group only adds a leading divider when the
  // previous group was non-empty so we never render two in a row.
  const sprintMenuItems = (() => {
    const items = [];
    const pushDivider = () => {
      if (items.length > 0 && items[items.length - 1]?.divider !== true) {
        items.push({ divider: true });
      }
    };
    if (isSprint && sprint?.state === "planned" && onStartSprint) {
      items.push({ label: "Start sprint", value: "start", icon: "play" });
    }
    if (isSprint && sprint?.state === "active" && onCompleteSprint) {
      items.push({ label: "Complete sprint", value: "complete", icon: "check" });
    }
    if (isSprint && onSetVersionStatus) {
      // Lock / unlock / reopen — these flip the OP version status directly
      // (open ↔ locked, closed → open). They don't move work packages.
      if (sprint?.status === "open") {
        pushDivider();
        items.push({ label: "Lock sprint", value: "lock", icon: "pause" });
      } else if (sprint?.status === "locked") {
        pushDivider();
        items.push({ label: "Unlock sprint", value: "unlock", icon: "play" });
      } else if (sprint?.status === "closed") {
        pushDivider();
        items.push({ label: "Reopen sprint", value: "reopen", icon: "refresh" });
      }
    }
    if (isSprint && onEditSprint) {
      pushDivider();
      items.push({ label: "Edit sprint", value: "edit", icon: "edit" });
    }
    if (isSprint && onExportJson) {
      items.push({ label: "Export to JSON", value: "export-json", icon: "download" });
    }
    if (isSprint && onDeleteSprint) {
      pushDivider();
      items.push({ label: "Delete sprint", value: "delete", icon: "trash", danger: true });
    }
    return items;
  })();
  const canManage = manageVersions?.allowed && !manageVersions?.loading;
  // Per-section pagination. Default page size is 25 top-level WPs; bump
  // by another 25 each time the user clicks "Show more". Sub-tasks under
  // an expanded parent never count against the cap so a deep tree still
  // reads as one item.
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const toggleExpand = (id) =>
    setExpandedSet((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const childIndex = useMemo(() => buildChildIndex(tasks), [tasks]);
  const roots = useMemo(() => rootsOf(tasks), [tasks]);

  const dropId = sprint ? sprint.id : "backlog";
  const { setNodeRef } = useDroppable({ id: dropId });

  // Count tasks by bucket — derived from the task data itself, not a static
  // STATUSES list. Each task carries `status` (bucket) on the mapper.
  const counts = tasks.reduce(
    (acc, t) => {
      const bucket = t.status || "todo";
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    },
    { todo: 0, progress: 0, review: 0, done: 0, blocked: 0 },
  );
  const totalPts = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const unassigned = tasks.filter((t) => !t.assignee).length;
  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id));
  const someSelected = tasks.some((t) => selected.has(t.id));

  const submitAdd = () => {
    if (newTitle.trim()) {
      onCreate({ title: newTitle.trim(), sprint: sprint ? sprint.id : null });
      setNewTitle("");
    }
    setAdding(false);
  };

  // Progress for the section header sliver — done WP / total WP. Kept
  // separate from the points-based progress in the cards so the bar
  // tracks "throughput" rather than effort estimates.
  const sectionPct =
    tasks.length > 0
      ? Math.round((counts.done / tasks.length) * 100)
      : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "luxe-card mb-3 overflow-x-auto transition-colors",
        isOver &&
          "border-accent outline-1 outline-dashed outline-accent -outline-offset-4",
      )}
    >
      <div className="relative flex items-center gap-2 px-3.5 py-3 bg-surface-sunken border-b border-border-soft">
        {/* Progress sliver — bottom-aligned hairline accent that fills to
            match the section's done/total ratio. Reads as a quiet
            architectural pulse on the header divider. */}
        {tasks.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute left-0 bottom-0 h-px bg-accent transition-[width] duration-500"
            style={{ width: `${sectionPct}%` }}
          />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="grid place-items-center w-6 h-6 rounded text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          <Icon
            name="chev-down"
            size={14}
            aria-hidden="true"
            className={cn("transition-transform", collapsed && "-rotate-90")}
          />
        </button>
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={cn(
              "font-display font-semibold text-[15px] tracking-[-0.018em] truncate",
              sprint?.status === "closed" ? "text-fg-subtle line-through" : "text-fg",
            )}
          >
            {title}
          </span>
          {isSprint && sprint?.status && <SprintStatusPill status={sprint.status} />}
          {/* Total count for the version (parents + children, every status). */}
          <span
            className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold bg-surface-muted text-fg-muted shrink-0"
            title={`${tasks.length} ${tasks.length === 1 ? "issue" : "issues"} in this version (incl. sub-tasks). ${roots.length} top-level shown.`}
          >
            {tasks.length}
          </span>
          <span className="text-xs text-fg-subtle truncate">{sub}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {unassigned > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-bold bg-tag-backend-bg text-tag-backend-fg"
              title={`${unassigned} ${unassigned === 1 ? "task is" : "tasks are"} unassigned`}
            >
              <Icon name="flag" size={10} aria-hidden="true" />
              {unassigned} unassigned
            </span>
          )}
          <span className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold bg-status-todo-bg text-status-todo-fg">
            {counts.todo}
          </span>
          <span className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold bg-status-progress-bg text-status-progress-fg">
            {counts.progress + counts.review}
          </span>
          <span className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold bg-status-done-bg text-status-done-fg">
            {counts.done}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-fg-subtle">{totalPts} pts</span>
          {/* Sync — aligns every WP in this sprint to the sprint's window
              (start/due dates) and rolls points up from children to
              parents through the parent chain. Only meaningful for a
              real sprint with both start + end dates set. Hidden on
              locked / closed sprints — those don't accept WP edits. */}
          {isSprint &&
            canManage &&
            onSyncSprint &&
            sprint?.status === "open" &&
            sprint?.start &&
            sprint.start !== "—" &&
            sprint?.end &&
            sprint.end !== "—" && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (syncing) return;
                  setSyncing(true);
                  try {
                    await onSyncSprint(sprint.id);
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing || tasks.length === 0}
                title={
                  tasks.length === 0
                    ? "No tasks to sync"
                    : `Align all dates to ${sprint.start} – ${sprint.end} and roll points up`
                }
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-surface-elevated text-[11.5px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon
                  name={syncing ? "loader" : "refresh"}
                  size={11}
                  className={syncing ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                {syncing ? "Syncing…" : "Sync"}
              </button>
            )}
          {/* Per-section sprint controls collapse into a single small kebab.
              Page-level "Create sprint" is rendered once at the page header
              so it doesn't duplicate per section. */}
          {isSprint && canManage && sprintMenuItems.length > 0 && (
            <button
              type="button"
              onClick={(e) => setSprintMenu(e.currentTarget.getBoundingClientRect())}
              aria-label="Sprint actions"
              aria-haspopup="menu"
              className="grid place-items-center w-6 h-6 rounded text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer"
            >
              <Icon name="more-h" size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {sprintMenu && (
        <Menu
          anchorRect={sprintMenu}
          align="right"
          width={180}
          onClose={() => setSprintMenu(null)}
          onSelect={(it) => {
            if (it.value === "start") onStartSprint?.(sprint);
            else if (it.value === "complete") onCompleteSprint?.(sprint);
            else if (it.value === "edit") onEditSprint?.(sprint);
            else if (it.value === "export-json") onExportJson?.(sprint);
            else if (it.value === "lock") onSetVersionStatus?.(sprint, "locked");
            else if (it.value === "unlock") onSetVersionStatus?.(sprint, "open");
            else if (it.value === "reopen") onSetVersionStatus?.(sprint, "open");
            else if (it.value === "delete") onDeleteSprint?.(sprint);
          }}
          items={sprintMenuItems}
        />
      )}
      {!collapsed && (
        <>
          {tasks.length > 0 && (
            <div
              className={`${HEADER_GRID} px-3 py-1.5 bg-surface-elevated border-b border-border-soft text-[10px] font-semibold uppercase tracking-wider text-fg-subtle`}
            >
              <Checkbox
                checked={allSelected}
                onChange={(v) => onSelectAll?.(tasks, v)}
                label={`Select all in ${title}`}
              />
              <span />
              <span className="backlog-cell-md" />
              <span>Title</span>
              <span>Status</span>
              <span className="backlog-cell-md justify-self-center">Pri</span>
              <span className="backlog-cell-md justify-self-center">Pts</span>
              <span className="backlog-cell-md">Sprint</span>
              <span className="justify-self-center">Assignee</span>
            </div>
          )}
          {tasks.length === 0 && (
            <div className="text-center py-6 px-3 text-[13px] text-fg-subtle">
              {isSprint
                ? "Drag stories from the backlog to plan this sprint."
                : "Backlog is empty."}
            </div>
          )}
          {roots.slice(0, visibleCount).map((t) => (
            <BacklogTreeRow
              key={t.id}
              task={t}
              depth={0}
              childIndex={childIndex}
              expandedSet={expandedSet}
              toggle={toggleExpand}
              selectedSet={selected}
              rowProps={{
                statuses,
                assignees,
                onSelectChange,
                onClick: onTaskClick,
                onStatusChange,
                onAssigneeChange,
              }}
            />
          ))}
          {roots.length > visibleCount && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border-soft bg-surface-sunken">
              <span className="text-[12px] text-fg-subtle">
                Showing {visibleCount} of {roots.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-surface-elevated text-[12px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
                >
                  Show {Math.min(PAGE_SIZE, roots.length - visibleCount)} more
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(roots.length)}
                  className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-subtle hover:text-fg cursor-pointer"
                >
                  Show all
                </button>
              </div>
            </div>
          )}
          {visibleCount > PAGE_SIZE && roots.length <= visibleCount && roots.length > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border-soft bg-surface-sunken">
              <button
                type="button"
                onClick={() => setVisibleCount(PAGE_SIZE)}
                className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-subtle hover:text-fg cursor-pointer"
              >
                Show less
              </button>
            </div>
          )}
          {canCreate ? (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-border-soft">
              {adding ? (
                <>
                  <Icon name="plus" size={14} className="text-fg-subtle" aria-hidden="true" />
                  <input
                    autoFocus
                    placeholder="What needs to be done?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitAdd();
                      if (e.key === "Escape") {
                        setAdding(false);
                        setNewTitle("");
                      }
                    }}
                    onBlur={submitAdd}
                    className="flex-1 bg-transparent border-0 outline-none text-[13px] text-fg placeholder:text-fg-faint"
                  />
                </>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setAdding(true)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && setAdding(true)
                  }
                  className="inline-flex items-center gap-1.5 px-2 h-7 rounded text-xs font-medium text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer"
                >
                  <Icon name="plus" size={12} aria-hidden="true" /> Create issue
                </span>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function Backlog({
  tasks,
  statuses,
  sprints,
  assignees,
  manageVersions = { allowed: true, loading: false },
  canCreate = true,
  currentUserId,
  onTaskClick,
  onMoveTask,
  onStatusChange,
  onAssigneeChange,
  onStartSprint,
  onCompleteSprint,
  onCreateSprint,
  onEditSprint,
  onDeleteSprint,
  onSyncSprint,
  onExportJson,
  onSetVersionStatus,
  onCreate,
  onBulkMoveSprint,
  onBulkAssign,
  onBulkDelete,
}) {
  const [overId, setOverId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [moveMenu, setMoveMenu] = useState(null);
  const [assignMenu, setAssignMenu] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // Versions are API-driven; no static fallback. If the API returns no
  // sprints (yet to load, or none in the project), we render nothing here
  // and only fall through to the unscheduled-tasks empty/section below.
  const sprintList = Array.isArray(sprints) ? sprints : [];
  // Single pass over tasks: bucket by sprint id (or "" for unscheduled) so
  // the per-sprint render below is O(tasks) instead of O(sprints × tasks).
  const tasksBySprint = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const k = t.sprint || "";
      const arr = m.get(k);
      if (arr) arr.push(t);
      else m.set(k, [t]);
    }
    return m;
  }, [tasks]);
  const unscheduled = tasksBySprint.get("") || [];

  const onSelectChange = (id, v) =>
    setSelected((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  const onSelectAll = (taskList, v) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const t of taskList) {
        if (v) n.add(t.id);
        else n.delete(t.id);
      }
      return n;
    });
  const clearSelection = () => setSelected(new Set());

  const totalUnassigned = useMemo(
    () => tasks.filter((t) => !t.assignee).length,
    [tasks],
  );

  if (sprintList.length === 0 && tasks.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          title="No sprints yet"
          body="Create a sprint to plan upcoming work, or just start adding work packages — they'll appear in the backlog."
          action={
            manageVersions.allowed
              ? { label: "Create sprint", onClick: () => onCreateSprint?.() }
              : null
          }
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragOver={(e) => setOverId(e.over?.id ?? null)}
      onDragEnd={(e) => {
        if (e.over && e.active) {
          const moved = tasks.find((t) => t.id === e.active.id);
          if (moved && moved.permissions?.update === false) {
            toast.error("You don't have permission to change this issue.");
          } else {
            const sprintId = e.over.id === "backlog" ? null : e.over.id;
            onMoveTask(e.active.id, sprintId);
          }
        }
        setOverId(null);
      }}
      onDragCancel={() => setOverId(null)}
    >
      <div className="px-2 py-2 pb-20">
        {totalUnassigned > 0 && (
          <div className="mx-1 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-tag-backend-bg bg-tag-backend-bg/40 text-[12px] text-tag-backend-fg">
            <Icon name="flag" size={12} aria-hidden="true" />
            <b>{totalUnassigned}</b>
            <span>
              {totalUnassigned === 1 ? "task is" : "tasks are"} unassigned across this project.
            </span>
          </div>
        )}

        {sprintList.map((sp) => {
          const sTasks = tasksBySprint.get(sp.id) || [];
          const hasDates =
            sp.start && sp.start !== "—" && sp.end && sp.end !== "—";
          const dateRange = hasDates ? `${sp.start} – ${sp.end}` : "No dates set";
          const sub =
            sp.state === "active" && sp.days != null && sp.dayIn != null
              ? `${dateRange}  •  Day ${sp.dayIn} of ${sp.days}`
              : dateRange;
          return (
            <BacklogSection
              key={sp.id}
              title={sp.name}
              sub={sub}
              tasks={sTasks}
              sprint={sp}
              isSprint
              isOver={overId === sp.id}
              statuses={statuses}
              assignees={assignees}
              manageVersions={manageVersions}
              canCreate={canCreate}
              selected={selected}
              onSelectChange={onSelectChange}
              onSelectAll={onSelectAll}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
              onAssigneeChange={onAssigneeChange}
              onStartSprint={onStartSprint}
              onCompleteSprint={onCompleteSprint}
              onCreateSprint={onCreateSprint}
              onEditSprint={onEditSprint}
              onDeleteSprint={onDeleteSprint}
              onSyncSprint={onSyncSprint}
              onExportJson={onExportJson}
              onSetVersionStatus={onSetVersionStatus}
              onCreate={onCreate}
            />
          );
        })}
        {unscheduled.length > 0 && (
        <BacklogSection
          title="Without sprint"
          sub={`${unscheduled.length} ${unscheduled.length === 1 ? "issue" : "issues"} not assigned to any version`}
          tasks={unscheduled}
          sprint={null}
          isSprint={false}
          isOver={overId === "backlog"}
          statuses={statuses}
          assignees={assignees}
          manageVersions={manageVersions}
          canCreate={canCreate}
          selected={selected}
          onSelectChange={onSelectChange}
          onSelectAll={onSelectAll}
          onTaskClick={onTaskClick}
          onStatusChange={onStatusChange}
          onAssigneeChange={onAssigneeChange}
          onCreateSprint={onCreateSprint}
          onCreate={onCreate}
        />
        )}
      </div>

      {/* Bulk action bar — glass surface so it floats over the rows
          without obscuring the work behind it. */}
      {selected.size > 0 && (
        <div className="glass fixed left-1/2 -translate-x-1/2 bottom-6 z-100 flex items-center gap-2 flex-wrap justify-center px-4 py-2 rounded-xl text-fg shadow-lg animate-slide-up max-w-[calc(100vw-32px)]">
          <span className="text-[13px] font-semibold">{selected.size} selected</span>
          <span className="w-px h-5 bg-border" />
          <button
            type="button"
            onClick={(e) =>
              setMoveMenu(e.currentTarget.getBoundingClientRect())
            }
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium hover:bg-surface-subtle cursor-pointer"
          >
            <Icon name="sprint" size={13} aria-hidden="true" />
            Move to…
          </button>
          <button
            type="button"
            onClick={(e) =>
              setAssignMenu(e.currentTarget.getBoundingClientRect())
            }
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium hover:bg-surface-subtle cursor-pointer"
          >
            <Icon name="people" size={13} aria-hidden="true" />
            Assign…
          </button>
          {currentUserId && (
            <button
              type="button"
              onClick={() => {
                onBulkAssign?.([...selected], currentUserId);
                clearSelection();
              }}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium hover:bg-surface-subtle cursor-pointer"
            >
              Assign to me
            </button>
          )}
          {onBulkDelete && (
            <>
              <span className="w-px h-5 bg-border" />
              <button
                type="button"
                onClick={() => {
                  const ids = [...selected];
                  onBulkDelete(ids, () => clearSelection());
                }}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium text-red-200 hover:bg-red-500/30 hover:text-white cursor-pointer"
                title="Delete selected work packages"
              >
                <Icon name="trash" size={13} aria-hidden="true" />
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium hover:bg-surface-subtle cursor-pointer"
            title="Clear selection"
          >
            <Icon name="x" size={13} aria-hidden="true" />
          </button>
          {moveMenu && (
            <Menu
              anchorRect={moveMenu}
              onClose={() => setMoveMenu(null)}
              onSelect={(it) => {
                onBulkMoveSprint?.([...selected], it.value);
                clearSelection();
              }}
              items={[
                { label: "Backlog", value: null, icon: "backlog" },
                { divider: true },
                ...sprintList.map((s) => ({
                  label:
                    s.name?.split(" — ")[0] +
                    (s.state === "active" ? " (active)" : ""),
                  value: s.id,
                })),
              ]}
            />
          )}
          {assignMenu && (
            <Menu
              anchorRect={assignMenu}
              onClose={() => setAssignMenu(null)}
              onSelect={(it) => {
                onBulkAssign?.([...selected], it.value);
                clearSelection();
              }}
              searchable
              searchPlaceholder="Search people…"
              width={240}
              items={[
                { label: "Unassigned", value: null },
                { divider: true },
                ...(Array.isArray(assignees) ? assignees : []).map((p) => ({
                  label: p.name,
                  value: p.id,
                  avatar: p,
                })),
              ]}
            />
          )}
        </div>
      )}
    </DndContext>
  );
}
