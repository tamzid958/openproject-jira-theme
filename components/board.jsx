"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Icon, PriorityIcon, TypeIcon } from "@/components/icons";
import { CarryOverChip } from "@/components/ui/carryover-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPill } from "@/components/ui/loading-pill";
import { TagPill } from "@/components/ui/tag-pill";
import { fetchJson } from "@/lib/api-client";
import { formatPoints } from "@/lib/openproject/story-points-constants";
import { PEOPLE } from "@/lib/data";
import { cn } from "@/lib/utils";

function CardBody({ task, dragging, assignees, carryOver }) {
  const assignee = task.assignee
    ? (Array.isArray(assignees) ? assignees : []).find(
        (u) => String(u.id) === String(task.assignee),
      ) ||
      PEOPLE[task.assignee] ||
      { id: task.assignee, name: task.assigneeName || "Assignee" }
    : null;
  return (
    <div
      className={cn(
        "board-card luxe-card rounded-md px-2.5 pt-2.5 pb-2 select-none cursor-grab",
        dragging && "opacity-50 cursor-grabbing rotate-[1deg]",
      )}
    >
      <div className="text-[13px] font-medium text-fg leading-tight mb-2 wrap-break-word">
        {task.title}
      </div>
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((l) => (
            <TagPill key={l} name={l} size="xs" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          <TypeIcon type={task.type} size={14} />
          <span
            className={cn(
              "font-mono text-[11px] text-fg-subtle font-medium",
              task.status === "done" && "line-through opacity-60",
            )}
          >
            {task.key}
          </span>
          {carryOver && <CarryOverChip entry={carryOver} />}
        </div>
        <div className="flex items-center gap-1.5">
          {task.comments > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-fg-subtle">
              <Icon name="comment" size={12} aria-hidden="true" /> {task.comments}
            </span>
          )}
          <PriorityIcon priority={task.priority} size={14} />
          {formatPoints(task) != null && (
            <span
              className="px-1.5 py-0.5 rounded-full bg-surface-muted text-[11px] font-medium text-fg-muted"
              title={
                task.points != null && String(task.points) !== formatPoints(task)
                  ? `${task.points} story points`
                  : undefined
              }
            >
              {formatPoints(task)}
            </span>
          )}
          <Avatar user={assignee} size="sm" />
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ task, onClick, assignees, carryOver }) {
  const draggable = task.permissions?.update !== false;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(draggable ? listeners : {})}
      onClick={() => onClick(task.id)}
      style={{ opacity: isDragging ? 0 : 1, cursor: draggable ? undefined : "pointer" }}
      aria-disabled={!draggable || undefined}
    >
      <CardBody
        task={task}
        dragging={isDragging}
        assignees={assignees}
        carryOver={carryOver}
      />
    </div>
  );
}

function DroppableColumn({
  status,
  children,
  count,
  isOver,
  onCreate,
  canCreate,
  dropDiscouraged,
}) {
  const { setNodeRef } = useDroppable({ id: `status:${status.id}` });
  return (
    <div
      className={cn(
        "board-column flex flex-col w-70 shrink-0 rounded-lg overflow-hidden border border-border-soft transition-opacity",
        dropDiscouraged && "opacity-50",
      )}
      style={{
        background:
          "linear-gradient(180deg, var(--color-surface-subtle) 0%, var(--color-surface-column) 200px)",
      }}
      title={
        dropDiscouraged
          ? "Workflow probably doesn't allow moving this issue here"
          : undefined
      }
    >
      <div className="flex items-center gap-2 px-3.5 py-3 bg-transparent border-b border-border-soft">
        <span className="eyebrow truncate">
          {status.name}
        </span>
        <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums text-fg-muted border border-border-soft">
          {count}
        </span>
        {canCreate ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Add issue to ${status.name}`}
            title="Add issue"
            onClick={onCreate}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onCreate?.()}
            className="grid place-items-center w-6 h-6 rounded text-fg-subtle cursor-pointer hover:bg-surface-subtle hover:text-fg"
          >
            <Icon name="plus" size={14} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2 min-h-20 transition-colors",
          isOver && "bg-accent-50 outline-2 outline-dashed outline-accent-200 -outline-offset-4 rounded-md",
        )}
      >
        {children}
      </div>
      {canCreate ? (
        <div className="px-2 py-1.5 pb-2 border-t border-border-soft bg-transparent">
          <button
            type="button"
            onClick={onCreate}
            aria-label={`Create issue in ${status.name}`}
            className="w-full flex items-center gap-1 px-2 h-7 rounded text-fg-subtle text-xs font-medium hover:bg-surface-subtle hover:text-fg cursor-pointer text-left"
          >
            <Icon name="plus" size={14} aria-hidden="true" /> Create issue
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Board({
  tasks,
  statuses,
  assignees,
  canCreate = true,
  onTaskClick,
  onMoveTask,
  onCreateInColumn,
  carryover,
}) {
  const [activeId, setActiveId] = useState(null);
  const [overStatusId, setOverStatusId] = useState(null);
  // Set of status ids the active card may transition into (per OP's
  // role × type workflow). `null` means "unknown" — either we haven't
  // started a drag, the lookup is in flight, or it failed (in which case
  // we let the server be the source of truth and don't dim anything).
  const [allowedStatusIds, setAllowedStatusIds] = useState(null);
  // Cache lookups by WP id so re-dragging the same card doesn't refetch.
  const allowedCacheRef = useRef(new Map());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Only top-level work packages render as cards on the board. A WP is a
  // child if its `epic` (parent native id) refers to another task that's
  // also in the visible pool — those live inside the parent's detail
  // modal (Sub-tasks tab) so we don't double-count them on the board.
  const filtered = useMemo(() => {
    const ids = new Set(tasks.map((t) => String(t.nativeId)));
    return tasks.filter((t) => !t.epic || !ids.has(String(t.epic)));
  }, [tasks]);

  // Show *every* configured status as a column, including closed ones (Done,
  // Rejected, etc.) even when they're currently empty — otherwise the column
  // vanishes the moment the user drags the last card out of it, leaving them
  // unable to drop anything back. Inferred statuses from tasks-with-unknown-
  // status are added as a fallback so we never silently drop a card.
  const columns = useMemo(() => {
    const seen = new Map();
    if (Array.isArray(statuses)) {
      for (const s of statuses) seen.set(String(s.id), s);
    }
    for (const t of filtered) {
      if (!t.statusId) continue;
      const id = String(t.statusId);
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          name: t.statusName || "Unknown",
          bucket: t.status,
          isClosed: t.status === "done",
        });
      }
    }
    return [...seen.values()].sort((a, b) => {
      if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
      return (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);
    });
  }, [statuses, filtered]);

  const grouped = useMemo(() => {
    const acc = {};
    for (const c of columns) acc[c.id] = [];
    for (const t of filtered) {
      const id = String(t.statusId || "");
      if (!acc[id]) acc[id] = [];
      acc[id].push(t);
    }
    return acc;
  }, [columns, filtered]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (columns.length === 0) {
    return (
      <div className="grid place-items-center py-10">
        <LoadingPill label="loading statuses" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          title="No issues here yet"
          body="When work packages are created in this project, they appear on the board grouped by status."
          action={
            canCreate
              ? { label: "Create issue", onClick: () => onCreateInColumn?.(columns[0]?.id) }
              : null
          }
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        setActiveId(e.active.id);
        const wpId = e.active.id;
        const cached = allowedCacheRef.current.get(wpId);
        if (cached !== undefined) {
          setAllowedStatusIds(cached);
          return;
        }
        // Optimistic: leave allowed=null while in flight so columns aren't
        // wrongly dimmed during the lookup. The drag still works; if the
        // user drops before we resolve, we let the server validate.
        setAllowedStatusIds(null);
        fetchJson(`/api/openproject/tasks/${encodeURIComponent(wpId)}/allowed-statuses`)
          .then((res) => {
            // The route returns `ids: null` when OpenProject didn't expose
            // workflow transitions (older OP version, locked schema, etc.).
            // Cache that signal as `null` — the server is the authority.
            const set = Array.isArray(res?.ids) ? new Set(res.ids.map(String)) : null;
            allowedCacheRef.current.set(wpId, set);
            setActiveId((current) => {
              if (current === wpId) setAllowedStatusIds(set);
              return current;
            });
          })
          .catch(() => {
            // Swallow — fall back to letting the server reject the drop.
          });
      }}
      onDragOver={(e) => {
        const overId = e.over?.id;
        if (typeof overId === "string" && overId.startsWith("status:")) {
          setOverStatusId(overId.slice("status:".length));
        } else {
          setOverStatusId(null);
        }
      }}
      onDragEnd={(e) => {
        const overId = e.over?.id;
        if (typeof overId === "string" && overId.startsWith("status:") && e.active) {
          const moved = tasks.find((t) => t.id === e.active.id);
          const targetStatusId = overId.slice("status:".length);
          if (moved && moved.permissions?.update === false) {
            toast.error("You don't have permission to change this issue.");
          } else {
            // Always attempt the move — the pre-flight is advisory only.
            // The server is the authority on workflow transitions, and
            // useUpdateTask now surfaces real errors via friendlyError.
            onMoveTask(e.active.id, targetStatusId);
          }
        }
        setActiveId(null);
        setOverStatusId(null);
        setAllowedStatusIds(null);
      }}
      onDragCancel={() => {
        setActiveId(null);
        setOverStatusId(null);
        setAllowedStatusIds(null);
      }}
    >
      <div className="board-scroller flex gap-3 px-2 pt-1 pb-3 h-full overflow-x-auto bg-surface-board">
        {columns.map((status) => (
          <DroppableColumn
            key={status.id}
            status={status}
            count={(grouped[status.id] || []).length}
            isOver={overStatusId === String(status.id)}
            canCreate={canCreate}
            onCreate={() => onCreateInColumn?.(status.id, status.name)}
            dropDiscouraged={
              !!activeId &&
              allowedStatusIds != null &&
              !allowedStatusIds.has(String(status.id))
            }
          >
            {(grouped[status.id] || []).map((t) => (
              <DraggableCard
                key={t.id}
                task={t}
                onClick={onTaskClick}
                assignees={assignees}
                carryOver={carryover?.byWpId?.[String(t.nativeId)] || null}
              />
            ))}
            {(grouped[status.id] || []).length === 0 &&
              overStatusId !== String(status.id) && (
                <div className="text-center py-6 px-2 text-xs text-fg-faint leading-relaxed">
                  Drop tasks here
                </div>
              )}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <CardBody
            task={activeTask}
            dragging
            assignees={assignees}
            carryOver={carryover?.byWpId?.[String(activeTask.nativeId)] || null}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
