"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { friendlyError } from "@/lib/api-client";
import { cn, formatRelDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar } from "@/components/ui/avatar";
import { CommentHtml } from "@/components/ui/comment-html";
import { StatusPill } from "@/components/ui/status-pill";
import { Menu } from "@/components/ui/menu";
import { LoadingPill } from "@/components/ui/loading-pill";
import { TagPill } from "@/components/ui/tag-pill";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon, PriorityIcon, TypeIcon } from "@/components/icons";
import { SubtaskBreakdown } from "@/components/subtask-breakdown";
import { RelationsPanel } from "@/components/relations-panel";
import { ActivityItem } from "@/components/activity-item";
import { AttachmentsGrid } from "@/components/attachments-grid";
import { WatcherButton } from "@/components/watcher-button";
import { TimeEntriesPanel } from "@/components/time-entries-panel";
import { TShirtPicker } from "@/components/tshirt-picker";
import {
  RichTextEditor,
  isHtmlEmpty,
} from "@/components/ui/rich-text-editor";
import { PEOPLE } from "@/lib/data";
import {
  useActivities,
  useCustomOptions,
  usePostComment,
  useUpdateComment,
  useWpSchema,
} from "@/lib/hooks/use-openproject-detail";

// Reusable Tailwind class strings — keep the JSX readable.
const FIELD_BTN =
  "flex items-center gap-1.5 min-h-7 -mx-1.5 px-1.5 py-1 rounded-md border-2 border-transparent text-[13px] cursor-pointer transition-colors hover:bg-surface-subtle hover:border-border-soft";
const FIELD_LABEL = "text-xs text-fg-subtle self-center whitespace-nowrap";
const BTN_BASE =
  "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md border border-border bg-surface-elevated text-fg text-xs font-medium whitespace-nowrap transition-colors hover:bg-surface-subtle hover:border-border-strong";
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md bg-accent text-on-accent text-xs font-semibold whitespace-nowrap transition-transform shadow-(--card-highlight) hover:-translate-y-px hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md border border-transparent bg-transparent text-fg text-xs font-medium whitespace-nowrap transition-colors hover:bg-surface-subtle";

function InlineSelect({
  value,
  items,
  onChange,
  render,
  placeholder = "None",
  disabled = false,
  disabledMessage = "You don't have permission to do that.",
  searchable = false,
  searchPlaceholder,
  menuWidth,
  menuMaxHeight,
}) {
  const [open, setOpen] = useState(null);
  const isEmpty = !value;
  return (
    <>
      <div
        className={[
          FIELD_BTN,
          isEmpty ? "text-fg-faint" : "",
          disabled ? "opacity-60 cursor-default hover:bg-transparent hover:border-transparent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => {
          if (disabled) return;
          setOpen(e.currentTarget.getBoundingClientRect());
        }}
        title={disabled ? disabledMessage : undefined}
        aria-disabled={disabled || undefined}
      >
        {render ? render(value) : value || placeholder}
      </div>
      {open && !disabled && (
        <Menu
          anchorRect={open}
          onClose={() => setOpen(null)}
          onSelect={(it) => onChange(it.value)}
          items={items}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          width={menuWidth || 200}
          maxHeight={menuMaxHeight}
        />
      )}
    </>
  );
}

// Single merged status control — the pill IS the dropdown trigger. Replaces
// the previous "banner + Change status select" duo that lived in the side.
function StatusSelect({ task, statuses, disabled, onUpdate, onChange }) {
  const [open, setOpen] = useState(null);
  const items = (statuses || [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => ({
      label: s.name,
      value: s.id,
      swatch: s.color || `var(--status-${s.bucket || "todo"})`,
      active: String(s.id) === String(task.statusId),
    }));
  const handleSelect = (v) => {
    const target = (statuses || []).find((s) => String(s.id) === String(v));
    if (target) {
      onUpdate(task.id, {
        statusId: v,
        status: target.bucket,
        statusName: target.name,
      });
      onChange?.(`Status → ${target.name}`);
    } else {
      onUpdate(task.id, { status: v });
      onChange?.(`Status → ${v}`);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (disabled) return;
          setOpen(e.currentTarget.getBoundingClientRect());
        }}
        disabled={disabled}
        title={disabled ? "You don't have permission to change status." : "Change status"}
        aria-disabled={disabled || undefined}
        className="inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-default disabled:opacity-60 group"
      >
        <StatusPill status={task.status} name={task.statusName} />
        {!disabled && (
          <Icon
            name="chev-down"
            size={12}
            className="text-fg-subtle transition-transform group-hover:translate-y-px"
            aria-hidden="true"
          />
        )}
      </button>
      {open && !disabled && (
        <Menu
          anchorRect={open}
          onClose={() => setOpen(null)}
          onSelect={(it) => handleSelect(it.value)}
          items={items}
        />
      )}
    </>
  );
}

function MultiInlineSelect({
  values,
  items,
  onChange,
  render,
  placeholder = "None",
  disabled = false,
  disabledMessage = "You don't have permission to do that.",
}) {
  const [open, setOpen] = useState(null);
  const selected = new Set(values || []);
  const isEmpty = selected.size === 0;
  return (
    <>
      <div
        className={[
          FIELD_BTN,
          "flex-wrap gap-1",
          isEmpty ? "text-fg-faint" : "",
          disabled ? "opacity-60 cursor-default hover:bg-transparent hover:border-transparent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => {
          if (disabled) return;
          setOpen(e.currentTarget.getBoundingClientRect());
        }}
        title={disabled ? disabledMessage : undefined}
        aria-disabled={disabled || undefined}
      >
        {render ? render(values) : isEmpty ? placeholder : [...selected].join(", ")}
      </div>
      {open && !disabled && (
        <Menu
          anchorRect={open}
          onClose={() => setOpen(null)}
          onSelect={(it) => {
            const next = new Set(selected);
            if (next.has(it.value)) next.delete(it.value);
            else next.add(it.value);
            onChange([...next]);
          }}
          items={items.map((it) => ({ ...it, active: selected.has(it.value) }))}
        />
      )}
    </>
  );
}

export function TaskDetail({
  taskId,
  tasks,
  projectName,
  projectId,
  currentUser,
  categories = [],
  statuses = [],
  priorities = [],
  sprints = [],
  epics = [],
  assignees = [],
  onClose,
  onUpdate,
  onChange,
  onSelectTask,
}) {
  const task = tasks.find((t) => t.id === taskId);
  const wpId = task?.nativeId;

  const [tab, setTab] = useState("comments");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task?.title ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(task?.description || "");
  const subtaskRef = useRef(null);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: { comment: "" },
  });
  const commentText = watch("comment") || "";

  const activities = useActivities(wpId);
  const post = usePostComment(wpId);
  const editComment = useUpdateComment(wpId);
  const onEditComment = async (id, text) => {
    await editComment.mutateAsync({ id, text });
    onChange?.("Comment updated");
  };
  const schemaQ = useWpSchema(task?.schemaHref || null);

  // Story points field — set NEXT_PUBLIC_OPENPROJECT_STORY_POINTS_FIELD
  // to either the native numeric `storyPoints` or a custom-field key
  // like `customField7` for t-shirt sizing.
  const spField =
    schemaQ.data?.fields?.[
      process.env.NEXT_PUBLIC_OPENPROJECT_STORY_POINTS_FIELD || "storyPoints"
    ];
  const spIsCustomOption = spField?.type === "CustomOption";
  const spOptionsQ = useCustomOptions(spField?.allowedValuesHref, !!spField?.allowedValuesHref);
  // Some OP installs don't expose `allowedValues` via the schema link; the
  // schema route discovers options from existing WPs and surfaces them on
  // `spField.allowedValues` instead. Prefer the link-fetched list when it's
  // available (more authoritative), fall back to the discovered list.
  const spOptions = spOptionsQ.data || spField?.allowedValues || null;

  useEffect(() => {
    if (!task) return;
    setTitleVal(task.title);
    setDescVal(task.description || "");
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const reporter = task.reporter
    ? (Array.isArray(assignees) ? assignees : []).find(
        (u) => String(u.id) === String(task.reporter),
      ) ||
      PEOPLE[task.reporter] ||
      (task.reporterName ? { id: task.reporter, name: task.reporterName } : null)
    : null;
  // Epic / parent breadcrumb is API-driven via the mapper's `epicName` +
  // `epic` (parent native id). No lookup against a static EPICS list.
  const epicNativeId = task.epic ? String(task.epic) : null;
  const epicLabel = task.epicName || null;

  const perm = task.permissions || {};
  const canEdit = perm.update !== false;
  const canAddComment = perm.addComment !== false;
  const canAddAttachment = perm.addAttachment !== false;
  const canLogTime = perm.logTime !== false;
  const canAddWatcher = perm.addWatcher !== false;
  const canRemoveWatcher = perm.removeWatcher !== false;

  const comments = (activities.data || []).filter((a) => a.kind === "comment");
  const history = (activities.data || []).filter((a) => a.kind !== "comment");

  const onSubmitComment = handleSubmit(async (values) => {
    const html = values.comment;
    // Editor returns HTML; treat tag-only / whitespace-only docs as empty.
    if (isHtmlEmpty(html)) return;
    try {
      // OP's `comment.raw` field accepts HTML and renders it; we send the
      // editor output verbatim so formatting (lists, headings, code, links)
      // is preserved on the server.
      await post.mutateAsync(html);
      reset({ comment: "" });
      onChange?.(`Comment added to ${task.key}`);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't post your comment — please try again."));
    }
  });

  const handlePoints = (value, href) => {
    if (spIsCustomOption) {
      if (href) {
        // Client already resolved the option href.
        onUpdate(task.id, { points: value, pointsHref: href });
      } else {
        // No href yet (allowed values still loading, or clearing) — send
        // just `points` and let the tasks/[id] PATCH route resolve the
        // matching CustomOption href server-side. Sending {pointsHref: null}
        // here would otherwise short-circuit that branch and clear the
        // field instead of setting the chosen value.
        onUpdate(task.id, { points: value });
      }
    } else {
      onUpdate(task.id, { points: value == null ? null : Number(value) });
    }
    onChange?.("Points updated");
  };

  const currentUserMini = currentUser
    ? {
        id: currentUser.id,
        initials: currentUser.name
          ?.split(" ")
          .map((s) => s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        color: "var(--accent)",
        name: currentUser.name,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-2 sm:p-6 scrim animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="
          bg-surface-elevated rounded-xl shadow-xl overflow-hidden animate-slide-up border border-border-soft
          grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] grid-rows-[56px_minmax(0,1fr)]
          w-[min(1100px,calc(100vw-16px))] sm:w-[min(1100px,calc(100vw-48px))]
          h-[min(740px,calc(100vh-16px))] sm:h-[min(740px,calc(100vh-48px))]
        "
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex items-center gap-3 border-b border-border-soft px-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-xs text-fg-subtle min-w-0 flex-1">
            <Icon name="folder" size={12} aria-hidden="true" />
            <span className="truncate text-fg-subtle">{projectName}</span>
            <span className="text-fg-faint">/</span>
            {epicLabel && epicNativeId ? (
              <button
                type="button"
                className="bg-transparent border-0 p-0 text-fg-subtle cursor-pointer hover:text-fg hover:underline truncate"
                onClick={() => onSelectTask?.(`wp-${epicNativeId}`)}
              >
                {epicLabel}
              </button>
            ) : (
              <span className="text-fg-subtle">Issues</span>
            )}
            <span className="text-fg-faint">/</span>
            <span className="flex items-center gap-1.5 text-fg whitespace-nowrap">
              <TypeIcon type={task.type} size={12} /> {task.key}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WatcherButton
              wpId={wpId}
              currentUserId={currentUser?.id}
              canAdd={canAddWatcher}
              canRemove={canRemoveWatcher}
            />
            <button
              type="button"
              className={BTN_GHOST}
              onClick={onClose}
              title="Close"
              aria-label="Close detail"
            >
              <Icon name="x" size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Main ──────────────────────────────────────────────────── */}
        <div className="overflow-y-auto px-4 sm:px-7 pt-4 sm:pt-6 pb-8 min-w-0">
          <div className="mb-3">
            <StatusSelect
              task={task}
              statuses={statuses}
              disabled={!canEdit}
              onUpdate={onUpdate}
              onChange={onChange}
            />
          </div>

          {editingTitle ? (
            <textarea
              autoFocus
              className="block w-full font-display text-[24px] font-semibold tracking-[-0.022em] leading-[1.25] text-fg bg-surface-elevated border-2 border-accent rounded-md px-2 py-1 mb-4 outline-none shadow-[0_0_0_3px_var(--accent-100)] resize-none"
              value={titleVal}
              rows={2}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleVal.trim() && titleVal !== task.title) {
                  onUpdate(task.id, { title: titleVal.trim() });
                  onChange?.("Title updated");
                } else {
                  setTitleVal(task.title);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.target.blur();
                }
                if (e.key === "Escape") {
                  setTitleVal(task.title);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <h2
              className={cn(
                "block w-full font-display text-[24px] font-semibold tracking-[-0.022em] leading-[1.25] text-fg",
                "border-2 border-transparent rounded-md px-2 py-1 -mx-2 mb-4",
                canEdit ? "cursor-text hover:bg-surface-subtle" : "cursor-default",
              )}
              onClick={() => canEdit && setEditingTitle(true)}
              title={canEdit ? "Click to edit title" : undefined}
              aria-disabled={!canEdit || undefined}
            >
              {task.title}
            </h2>
          )}

          {(canAddAttachment || canEdit) && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {canAddAttachment && (
                <button
                  type="button"
                  className={BTN_BASE}
                  onClick={() => {
                    setTab("attachments");
                    setTimeout(
                      () => subtaskRef.current?.scrollIntoView({ behavior: "smooth" }),
                      50,
                    );
                  }}
                  aria-label="Attach files"
                >
                  <Icon name="paperclip" size={14} aria-hidden="true" />
                  Attach
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className={BTN_BASE}
                  onClick={() => subtaskRef.current?.startAdd()}
                  aria-label="Add sub-task"
                >
                  <Icon name="plus" size={14} aria-hidden="true" />
                  Sub-task
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <section className="mb-6">
            <header className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[13px] font-semibold text-fg">Description</span>
              {!editingDesc && canEdit && (
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => setEditingDesc(true)}
                  aria-label="Edit description"
                >
                  <Icon name="edit" size={12} aria-hidden="true" /> Edit
                </button>
              )}
            </header>
            {editingDesc ? (
              <div>
                <RichTextEditor
                  value={descVal}
                  onChange={setDescVal}
                  placeholder="Describe the work — formatting is supported."
                  minHeight={160}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5 mt-2">
                  <button
                    type="button"
                    className={BTN_GHOST}
                    onClick={() => {
                      setDescVal(task.description || "");
                      setEditingDesc(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    onClick={() => {
                      onUpdate(task.id, { description: descVal });
                      setEditingDesc(false);
                      onChange?.("Description updated");
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : descVal ? (
              <div
                className="op-html prose-comment text-[13.5px] leading-relaxed text-fg border-2 border-transparent rounded-md px-2.5 py-2 -mx-2.5 hover:bg-surface-subtle cursor-text"
                onDoubleClick={() => canEdit && setEditingDesc(true)}
                title={canEdit ? "Double-click to edit" : undefined}
              >
                {/^\s*</.test(descVal) ? (
                  // Already HTML — render directly through CommentHtml so
                  // mention pills and op-uc-* classes are preserved.
                  <CommentHtml html={descVal} />
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{descVal}</ReactMarkdown>
                )}
              </div>
            ) : canEdit ? (
              <div
                className="text-sm text-fg-faint border-2 border-transparent rounded-md px-2.5 py-2 -mx-2.5 cursor-text hover:bg-surface-subtle"
                onClick={() => setEditingDesc(true)}
              >
                Click to add a description…
              </div>
            ) : (
              <div className="text-sm text-fg-faint px-2.5 py-2 -mx-2.5" aria-disabled="true">
                No description.
              </div>
            )}
          </section>

          {/* Sub-tasks */}
          <section className="mb-6">
            <SubtaskBreakdown
              ref={subtaskRef}
              parent={task}
              projectId={projectId}
              statuses={statuses}
              assignees={assignees}
              sprints={sprints}
              canCreate={canEdit}
              allTasks={tasks}
              onUpdate={onUpdate}
              onChange={onChange}
              onTaskClick={onSelectTask}
            />
          </section>

          {/* Relations — blocks/relates/duplicates/precedes/etc. Parent and
              children are surfaced separately via Sub-tasks above; this
              panel covers the v3 `Relation` resource. */}
          <section className="mb-6">
            <RelationsPanel
              wpId={wpId}
              selfTaskId={task.id}
              canEdit={canEdit && (perm.addRelation !== false)}
              allTasks={tasks}
              onTaskClick={onSelectTask}
              onChange={onChange}
            />
          </section>

          {/* Attachments */}
          <section className="mb-6">
            <AttachmentsGrid wpId={wpId} canAdd={canAddAttachment} />
          </section>

          {/* Activity tabs */}
          <section className="mt-7">
            <div className="flex gap-0.5 border-b border-border mb-3 -mb-px">
              {[
                { id: "comments", label: `Comments${comments.length > 0 ? ` · ${comments.length}` : ""}` },
                { id: "history", label: `History${history.length > 0 ? ` · ${history.length}` : ""}` },
                { id: "work", label: "Work log" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "px-3 py-2 text-[13px] cursor-pointer border-b-2 mb-[-1px] transition-colors",
                    tab === t.id
                      ? "text-accent-700 border-accent font-semibold"
                      : "text-fg-subtle border-transparent hover:text-fg font-medium",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "comments" && (
              <div className="pt-3">
                {activities.isLoading && <LoadingPill label="loading comments" />}
                {!activities.isLoading && comments.length === 0 && (
                  <div className="text-[13px] text-fg-subtle text-center py-4">
                    No comments yet — start the conversation.
                  </div>
                )}
                {comments.map((c) => (
                  <ActivityItem key={c.id} activity={c} onEdit={onEditComment} />
                ))}
                {!canAddComment ? (
                  <div className="text-xs text-fg-subtle text-center py-3" aria-live="polite">
                    You don&apos;t have permission to comment on this issue.
                  </div>
                ) : (
                  <form
                    onSubmit={onSubmitComment}
                    className="flex gap-2.5 mt-3"
                  >
                    <Avatar user={currentUserMini} />
                    <div className="flex-1 min-w-0">
                      <Controller
                        control={control}
                        name="comment"
                        render={({ field }) => (
                          <RichTextEditor
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Add a comment…"
                            minHeight={64}
                            onSubmit={onSubmitComment}
                          />
                        )}
                      />
                      <div className="flex items-center gap-1 mt-1.5 text-fg-subtle">
                        <span className="text-[10.5px] text-fg-faint">
                          ⌘+Enter to send
                        </span>
                        <div className="ml-auto flex gap-1.5">
                          <button
                            type="button"
                            className={BTN_GHOST}
                            onClick={() => reset({ comment: "" })}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className={BTN_PRIMARY}
                            disabled={isHtmlEmpty(commentText) || post.isPending}
                          >
                            {post.isPending ? "Posting…" : "Comment"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="pt-3">
                {activities.isLoading && <LoadingPill label="loading history" />}
                {!activities.isLoading && history.length === 0 && (
                  <div className="text-[13px] text-fg-subtle text-center py-4">No history yet.</div>
                )}
                {history.map((h) => (
                  <ActivityItem key={h.id} activity={h} />
                ))}
              </div>
            )}

            {tab === "work" && (
              <div className="pt-3">
                <TimeEntriesPanel wpId={wpId} currentUserId={currentUser?.id} canLog={canLogTime} />
              </div>
            )}
          </section>
        </div>

        {/* ── Side panel ─────────────────────────────────────────────── */}
        <aside className="border-t xl:border-t-0 xl:border-l border-border-soft bg-surface-sunken overflow-y-auto px-4 pt-4 sm:pt-5 pb-6 min-w-0">
          {/* Details */}
          <div className="mb-5">
            <div className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">
              Details
            </div>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
              <span className={FIELD_LABEL}>Assignee</span>
              <InlineSelect
                value={task.assignee}
                disabled={!canEdit}
                searchable
                searchPlaceholder="Search people…"
                menuWidth={240}
                menuMaxHeight={300}
                items={[
                  { label: "Unassigned", value: null, active: !task.assignee },
                  { divider: true },
                  ...(Array.isArray(assignees) ? assignees : []).map((p) => ({
                    label: p.name,
                    value: p.id,
                    avatar: p,
                    active: String(p.id) === String(task.assignee),
                  })),
                ]}
                onChange={(v) => {
                  onUpdate(task.id, { assignee: v });
                  onChange?.("Assignee updated");
                }}
                render={(v) => {
                  const u =
                    (Array.isArray(assignees) ? assignees : []).find(
                      (p) => String(p.id) === String(v),
                    ) ||
                    (v ? { id: v, name: task.assigneeName || "Assignee" } : null);
                  return u ? (
                    <>
                      <Avatar user={u} size="sm" />
                      <span className="truncate">{u.name}</span>
                    </>
                  ) : (
                    <span>Unassigned</span>
                  );
                }}
              />

              <span className={FIELD_LABEL}>Reporter</span>
              <div className={`${FIELD_BTN} cursor-default hover:bg-transparent hover:border-transparent`}>
                {reporter ? (
                  <>
                    <Avatar user={reporter} size="sm" />
                    <span className="truncate">{reporter.name}</span>
                  </>
                ) : (
                  <span className="text-fg-faint">{task.reporterName || "—"}</span>
                )}
              </div>

              <span className={FIELD_LABEL}>Priority</span>
              <InlineSelect
                value={task.priorityId}
                disabled={!canEdit}
                items={(priorities || [])
                  .slice()
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((p) => ({
                    label: p.name,
                    value: p.id,
                    swatch: p.color || `var(--pri-${p.bucket || "medium"})`,
                    active: String(p.id) === String(task.priorityId),
                  }))}
                onChange={(v) => {
                  const target = (priorities || []).find((p) => String(p.id) === String(v));
                  if (target) {
                    onUpdate(task.id, {
                      priorityId: v,
                      priority: target.bucket,
                      priorityName: target.name,
                    });
                  } else {
                    onUpdate(task.id, { priority: v });
                  }
                  onChange?.("Priority updated");
                }}
                render={() => (
                  <>
                    <PriorityIcon priority={task.priority} size={14} />
                    <span className="truncate">{task.priorityName || task.priority || "—"}</span>
                  </>
                )}
              />

              <span className={FIELD_LABEL}>Story points</span>
              <div
                className={`${FIELD_BTN} ${canEdit ? "" : "opacity-60 pointer-events-none"}`}
                aria-disabled={!canEdit || undefined}
              >
                {schemaQ.isLoading ? (
                  <LoadingPill label="loading field" />
                ) : spIsCustomOption ? (
                  <TShirtPicker
                    value={task.pointsRaw}
                    allowed={spOptions}
                    onChange={handlePoints}
                  />
                ) : (
                  <InlineSelect
                    value={task.points}
                    disabled={!canEdit}
                    items={[
                      { label: "—", value: null },
                      { divider: true },
                      ...[1, 2, 3, 5, 8, 13, 21].map((n) => ({
                        label: String(n),
                        value: n,
                        active: n === task.points,
                      })),
                    ]}
                    onChange={(v) => handlePoints(v, null)}
                    render={(v) => (
                      <span className="px-2 py-0.5 rounded-full bg-surface-muted text-xs font-medium text-fg-muted">
                        {v || "—"}
                      </span>
                    )}
                  />
                )}
              </div>

              <span className={FIELD_LABEL}>Sprint</span>
              <InlineSelect
                value={task.sprint}
                disabled={!canEdit}
                items={[
                  { label: "Without sprint", value: null, active: !task.sprint },
                  { divider: true },
                  ...(sprints || []).map((s) => ({
                    label: s.name,
                    value: s.id,
                    active: s.id === task.sprint,
                  })),
                ]}
                onChange={(v) => {
                  onUpdate(task.id, { sprint: v });
                  onChange?.("Sprint updated");
                }}
                render={(v) => {
                  if (!v) return <span>Without sprint</span>;
                  const found = (sprints || []).find((s) => s.id === v);
                  const name =
                    (found?.name || task.sprintName || "Sprint").split(" — ")[0] ||
                    "Sprint";
                  return (
                    <>
                      <Icon name="sprint" size={13} className="text-accent" aria-hidden="true" />
                      <span className="truncate">{name}</span>
                    </>
                  );
                }}
              />

              <span className={FIELD_LABEL}>Epic</span>
              <InlineSelect
                value={task.epic}
                disabled={!canEdit}
                items={[
                  { label: "None", value: null, active: !task.epic },
                  { divider: true },
                  ...(epics || []).map((e) => ({
                    label: e.title || e.name,
                    value: String(e.nativeId ?? e.id),
                    swatch: e.color || "var(--accent)",
                    active: String(task.epic) === String(e.nativeId ?? e.id),
                  })),
                ]}
                onChange={(v) => {
                  onUpdate(task.id, { parent: v });
                  onChange?.("Epic updated");
                }}
                render={(v) => {
                  if (!v) return <span>None</span>;
                  const found = (epics || []).find(
                    (e) => String(e.nativeId ?? e.id) === String(v),
                  );
                  const name = found?.title || found?.name || task.epicName || "Epic";
                  return (
                    <>
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: found?.color || "var(--accent)" }}
                      />
                      <span className="truncate">{name}</span>
                    </>
                  );
                }}
              />

              <span className={FIELD_LABEL}>Tag</span>
              {/* OP work packages have at most ONE category (`_links.category`
                  per the v3 spec), so this is a single-select. We still
                  call it "Tag" in the UI for consistency with the rest of
                  the app's naming. */}
              <InlineSelect
                value={task.categoryId || null}
                disabled={!canEdit}
                searchable={(categories?.length || 0) > 6}
                searchPlaceholder="Search tags…"
                items={[
                  { label: "None", value: null, active: !task.categoryId },
                  ...(categories || []).map((c) => ({
                    label: c.name,
                    value: c.id,
                    active: String(c.id) === String(task.categoryId),
                  })),
                ]}
                onChange={(id) => {
                  const cat = (categories || []).find(
                    (c) => String(c.id) === String(id),
                  );
                  // Optimistic: update labels + categoryName so the chip
                  // re-renders instantly, plus categoryId so the cache
                  // matches what the server will return.
                  onUpdate(task.id, {
                    categoryId: id,
                    categoryName: cat?.name || null,
                    labels: cat?.name ? [cat.name] : [],
                  });
                  onChange?.(id ? "Tag updated" : "Tag removed");
                }}
                render={(v) => {
                  if (!v) return <span className="text-fg-faint">None</span>;
                  const cat = (categories || []).find(
                    (c) => String(c.id) === String(v),
                  );
                  return <TagPill name={cat?.name || task.categoryName || "Tag"} />;
                }}
              />

              <span className={FIELD_LABEL}>Start date</span>
              <DatePicker
                value={task.startDate}
                disabled={!canEdit}
                onChange={(d) => {
                  onUpdate(task.id, { startDate: d });
                  onChange?.("Start date updated");
                }}
                placeholder="Set start date"
              />

              <span className={FIELD_LABEL}>Due date</span>
              <DatePicker
                value={task.dueDate}
                disabled={!canEdit}
                onChange={(d) => {
                  onUpdate(task.id, { dueDate: d });
                  onChange?.("Due date updated");
                }}
                placeholder="Set due date"
              />
            </div>
          </div>

          {/* Activity meta */}
          <div className="mb-2">
            <div className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-1.5">
              Activity
            </div>
            <div className="text-xs text-fg-subtle leading-5">
              Created {task.createdAt ? formatRelDate(task.createdAt) : "—"}
              {reporter
                ? ` by ${reporter.name}`
                : task.reporterName
                ? ` by ${task.reporterName}`
                : ""}
            </div>
            <div className="text-xs text-fg-subtle leading-5">
              Updated {task.updatedAt ? formatRelDate(task.updatedAt) : "—"}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
