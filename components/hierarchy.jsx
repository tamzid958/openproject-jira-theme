"use client";

import { Fragment, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { TagPill } from "@/components/ui/tag-pill";
import { Icon, TypeIcon } from "@/components/icons";
import { EPICS, PEOPLE, SPRINTS } from "@/lib/data";

const COLS =
  "minmax(0,28px)_minmax(0,28px)_minmax(60px,80px)_minmax(0,1fr)_minmax(96px,140px)_minmax(0,140px)_minmax(48px,52px)_minmax(28px,32px)";

function buildChildIndex(tasks) {
  const idx = new Map();
  const ids = new Set(tasks.map((t) => String(t.nativeId)));
  for (const t of tasks) {
    if (!t.epic || !ids.has(String(t.epic))) continue;
    const key = String(t.epic);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(t);
  }
  for (const list of idx.values()) {
    list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }
  return idx;
}

function rootsOf(groupTasks, childIndex) {
  const groupIds = new Set(groupTasks.map((t) => String(t.nativeId)));
  return groupTasks.filter((t) => !t.epic || !groupIds.has(String(t.epic)));
}

function GroupHeader({ group, expanded, onToggle, onClick }) {
  const { color, name, id, tasks: groupTasks, progress } = group;
  return (
    <div
      onClick={onClick}
      className="grid items-center gap-3 pl-2 pr-4 py-2.5 border-b border-border-soft cursor-pointer text-[13px] hover:bg-surface-subtle transition-colors bg-[#fbfbfd] relative"
      style={{
        gridTemplateColumns: `${COLS}`.replace(/_/g, " "),
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="flex justify-end pl-1">
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="grid place-items-center w-5 h-5 rounded text-fg-subtle cursor-pointer hover:bg-surface-muted"
        >
          <Icon
            name={expanded ? "chev-down" : "chev-right"}
            size={12}
            aria-hidden="true"
          />
        </span>
      </span>
      <span
        className="grid place-items-center w-5 h-5 rounded text-white text-[10px] font-bold shrink-0"
        style={{ background: color }}
      >
        {id?.slice(0, 2)}
      </span>
      <span className="font-mono text-[11px] text-fg-subtle font-medium truncate">
        {id}
      </span>
      <span className="font-semibold text-fg truncate">
        {name}
        <span className="ml-2 font-medium text-fg-subtle text-xs">
          · {groupTasks.length} {groupTasks.length === 1 ? "item" : "items"}
        </span>
      </span>
      <span />
      <span className="flex items-center gap-2">
        <span className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
          <span
            className={`block h-full rounded-full ${
              progress === 100 ? "bg-status-done" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </span>
        <span className="text-[11px] text-fg-subtle font-semibold w-8 text-right shrink-0">
          {progress}%
        </span>
      </span>
      <span />
      <span />
    </div>
  );
}

function TaskRow({
  task,
  depth,
  hasChildren,
  expanded,
  onToggle,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="grid items-center gap-3 pl-2 pr-4 py-2 border-b border-border-soft cursor-pointer text-[13px] bg-white hover:bg-surface-subtle transition-colors"
      style={{
        gridTemplateColumns: `${COLS}`.replace(/_/g, " "),
        paddingLeft: `${depth * 24 + 8}px`,
      }}
    >
      <span className="flex justify-end">
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="grid place-items-center w-5 h-5 rounded text-fg-subtle cursor-pointer hover:bg-surface-muted"
          >
            <Icon
              name={expanded ? "chev-down" : "chev-right"}
              size={12}
              aria-hidden="true"
            />
          </span>
        ) : (
          <span className="w-5" />
        )}
      </span>
      <TypeIcon type={task.type} size={14} />
      <span className="font-mono text-[11px] text-fg-subtle font-medium truncate">
        {task.key}
      </span>
      <span
        className={`truncate flex items-center gap-2 min-w-0 ${
          task.status === "done" ? "text-fg-subtle line-through" : "text-fg"
        }`}
      >
        <span className="truncate">{task.title}</span>
        {task.labels && task.labels.length > 0 && (
          <span className="hidden lg:flex items-center gap-1 shrink-0">
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
      <span className="min-w-0">
        {task.status && <StatusPill status={task.status} name={task.statusName} />}
      </span>
      <span className="text-xs text-fg-subtle truncate">
        {task.assigneeName ||
          (task.assignee ? PEOPLE[task.assignee]?.name : "") ||
          "Unassigned"}
      </span>
      <span className="text-[11px] text-fg-subtle text-center bg-surface-muted rounded-full px-2 py-0.5 font-semibold justify-self-center">
        {task.points || "—"}
      </span>
      <span className="justify-self-center">
        <Avatar user={task.assignee} size="sm" />
      </span>
    </div>
  );
}

function TaskTreeRow({ task, depth, childIndex, expandedSet, toggle, onTaskClick }) {
  const children = childIndex.get(String(task.nativeId)) || [];
  const isOpen = expandedSet.has(task.id);
  return (
    <Fragment>
      <TaskRow
        task={task}
        depth={depth}
        hasChildren={children.length > 0}
        expanded={isOpen}
        onToggle={() => toggle(task.id)}
        onClick={() => onTaskClick(task.id)}
      />
      {isOpen &&
        children.map((c) => (
          <TaskTreeRow
            key={c.id}
            task={c}
            depth={depth + 1}
            childIndex={childIndex}
            expandedSet={expandedSet}
            toggle={toggle}
            onTaskClick={onTaskClick}
          />
        ))}
    </Fragment>
  );
}

const GROUP_BTN_BASE =
  "inline-flex items-center h-7 px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer";

export function Hierarchy({ tasks, onTaskClick }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [groupBy, setGroupBy] = useState("epic");
  const toggle = (id) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const childIndex = useMemo(() => buildChildIndex(tasks), [tasks]);

  const groups = useMemo(() => {
    if (groupBy === "epic") {
      return EPICS.map((epic) => {
        const epicTasks = tasks.filter((t) => t.epic === epic.id);
        const doneTasks = epicTasks.filter((t) => t.status === "done").length;
        const progress =
          epicTasks.length === 0
            ? 0
            : Math.round((doneTasks / epicTasks.length) * 100);
        return {
          key: `epic-${epic.id}`,
          id: epic.key,
          name: epic.name,
          color: epic.color,
          tasks: epicTasks,
          progress,
        };
      }).filter((g) => g.tasks.length > 0);
    }
    if (groupBy === "assignee") {
      const buckets = new Map();
      for (const t of tasks) {
        const k = t.assignee || "unassigned";
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(t);
      }
      return [...buckets.entries()].map(([uid, list]) => {
        const u = uid === "unassigned" ? null : PEOPLE[uid];
        const done = list.filter((t) => t.status === "done").length;
        return {
          key: `assignee-${uid}`,
          id: uid === "unassigned" ? "—" : u?.initials || uid,
          name: u?.name || list[0]?.assigneeName || "Unassigned",
          color: u?.color || "#6b7384",
          tasks: list,
          progress: list.length ? Math.round((done / list.length) * 100) : 0,
        };
      });
    }
    if (groupBy === "sprint") {
      const buckets = new Map();
      for (const t of tasks) {
        const k = t.sprint || "backlog";
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(t);
      }
      return [...buckets.entries()].map(([sid, list]) => {
        const s = sid === "backlog" ? null : SPRINTS.find((x) => x.id === sid);
        const done = list.filter((t) => t.status === "done").length;
        return {
          key: `sprint-${sid}`,
          id: sid === "backlog" ? "—" : "S",
          name:
            s?.name?.split(" — ")[0] ||
            (sid === "backlog" ? "Backlog" : list[0]?.sprintName || "Unknown sprint"),
          color: "#7c3aed",
          tasks: list,
          progress: list.length ? Math.round((done / list.length) * 100) : 0,
        };
      });
    }
    return [];
  }, [groupBy, tasks]);

  const groupBtn = (id, label) => (
    <button
      key={id}
      type="button"
      className={[
        GROUP_BTN_BASE,
        groupBy === id
          ? "bg-accent-50 border-accent-200 text-accent-700 font-semibold"
          : "bg-white border-border text-fg hover:bg-surface-subtle hover:border-border-strong",
      ].join(" ")}
      onClick={() => setGroupBy(id)}
    >
      {label}
    </button>
  );

  const totalIssues = tasks.length;
  const doneIssues = tasks.filter((t) => t.status === "done").length;
  const overallProgress = totalIssues
    ? Math.round((doneIssues / totalIssues) * 100)
    : 0;

  return (
    <div className="bg-surface-app min-h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-6 pt-4 pb-3">
        <span className="text-xs text-fg-subtle font-medium">Group by</span>
        {groupBtn("epic", "Epic")}
        {groupBtn("assignee", "Assignee")}
        {groupBtn("sprint", "Sprint")}
        <div className="ml-auto flex items-center gap-3 text-xs text-fg-subtle">
          <span>
            <b className="text-fg">{totalIssues}</b> issues
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            <b className="text-fg">{groups.length}</b> group
            {groups.length === 1 ? "" : "s"}
          </span>
          {totalIssues > 0 && (
            <>
              <span className="hidden sm:inline">·</span>
              <span>
                <b className="text-fg">{overallProgress}%</b> done
              </span>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mx-6 mb-6 bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        {/* Header row */}
        <div
          className="grid items-center gap-3 pl-2 pr-4 py-2 bg-[#fbfbfd] border-b border-border text-[10px] font-semibold uppercase tracking-wider text-fg-subtle"
          style={{ gridTemplateColumns: `${COLS}`.replace(/_/g, " ") }}
        >
          <span />
          <span />
          <span>Key</span>
          <span>Title</span>
          <span>Status</span>
          <span>Assignee</span>
          <span className="text-center">Pts</span>
          <span />
        </div>

        {groups.map((g) => {
          const isOpen = expanded.has(g.key);
          return (
            <Fragment key={g.key}>
              <GroupHeader
                group={g}
                expanded={isOpen}
                onToggle={() => toggle(g.key)}
                onClick={() => toggle(g.key)}
              />
              {isOpen &&
                rootsOf(g.tasks, childIndex).map((t) => (
                  <TaskTreeRow
                    key={t.id}
                    task={t}
                    depth={1}
                    childIndex={childIndex}
                    expandedSet={expanded}
                    toggle={toggle}
                    onTaskClick={onTaskClick}
                  />
                ))}
            </Fragment>
          );
        })}
        {groups.length === 0 && (
          <EmptyState
            title="No work packages here"
            body="Either this project has no work packages yet, or your filters are too narrow."
          />
        )}
      </div>
    </div>
  );
}
