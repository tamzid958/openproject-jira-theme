"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { TagPill } from "@/components/ui/tag-pill";
import { Icon, PriorityIcon, TypeIcon } from "@/components/icons";
import { PEOPLE } from "@/lib/data";
import { useCustomOptions, useWpSchema } from "@/lib/hooks/use-openproject-detail";

const schema = z.object({
  type: z.string().min(1, "Pick a type"),
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional().default(""),
  assignee: z.string().nullable().optional(),
  priority: z.string().min(1, "Pick a priority"),
  points: z.union([z.number(), z.string()]).nullable().optional(),
  pointsHref: z.string().nullable().optional(),
  sprint: z.string().nullable().optional(),
  epic: z.string().nullable().optional(),
  labels: z.array(z.string()).default([]),
  status: z.string().nullable().optional(),
});

// ── UX tokens ────────────────────────────────────────────────────────────
// One source of truth for the picker rows so visual rhythm is consistent
// across every attribute. The picker is borderless inside its row and gets
// its hover affordance from the surrounding row hover.
const ROW =
  "flex items-center gap-2 h-9 px-2 -mx-2 rounded-md hover:bg-surface-subtle transition-colors";
const ROW_LABEL =
  "inline-flex items-center gap-2 w-32 shrink-0 text-[12.5px] font-medium text-fg-muted";
const ROW_VALUE =
  "flex-1 inline-flex items-center gap-2 min-w-0 text-[13px] text-fg cursor-pointer text-left";
const ROW_PLACEHOLDER = "text-fg-faint font-normal";

const TITLE_INPUT =
  "w-full h-12 px-0 border-0 outline-none bg-transparent text-[20px] font-display font-bold text-fg placeholder:text-fg-faint focus:placeholder:text-fg-subtle";
const DESC_TEXTAREA =
  "w-full min-h-[120px] p-3 rounded-lg border border-border bg-surface-elevated text-[13px] text-fg leading-relaxed placeholder:text-fg-faint outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)] resize-y font-sans";

// "Type" tab strip at the top — surfaces the most-likely-to-flip decision.
// Falls back to a bucket-grouped strip when the API types haven't loaded.
const FALLBACK_TYPES = [
  { id: "task", bucket: "task", name: "Task" },
  { id: "bug", bucket: "bug", name: "Bug" },
  { id: "story", bucket: "story", name: "Story" },
  { id: "epic", bucket: "epic", name: "Epic" },
];

function TypeStrip({ types, value, onChange }) {
  const list = (types && types.length > 0 ? types : FALLBACK_TYPES)
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      role="tablist"
      aria-label="Issue type"
    >
      {list.map((t) => {
        const active = String(t.id) === String(value);
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(String(t.id))}
            className={[
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-colors",
              active
                ? "bg-accent-50 border-accent-200 text-accent-700"
                : "bg-surface-elevated border-border text-fg-muted hover:bg-surface-subtle hover:border-border-strong",
            ].join(" ")}
          >
            <TypeIcon type={t.bucket || "task"} size={12} />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

export function CreateTask({
  onClose,
  onCreate,
  defaultSprint = null,
  defaultStatus = null,
  projectName = "Project",
  categories = [],
  types = [],
  priorities = [],
  sprints = [],
  epics = [],
  assignees = [],
  tasks = [],
  currentUser = null,
}) {
  const [createMore, setCreateMore] = useState(false);
  const [assignMenu, setAssignMenu] = useState(null);
  const [priorityMenu, setPriorityMenu] = useState(null);
  const [pointsMenu, setPointsMenu] = useState(null);
  const [sprintMenu, setSprintMenu] = useState(null);
  const [epicMenu, setEpicMenu] = useState(null);
  const [labelMenu, setLabelMenu] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: types?.[0]?.id ? String(types[0].id) : "task",
      title: "",
      description: "",
      assignee: null,
      // Form value is the priority's unique id (string). When priorities
      // haven't loaded yet we keep "medium" as a bucket-shaped fallback;
      // an effect upgrades it to the real id once the list arrives. This
      // avoids two rows lighting up active when OP exposes both
      // "Normal" and "Medium" (both share bucket=medium).
      priority: "medium",
      points: null,
      sprint: defaultSprint,
      status: defaultStatus,
      epic: null,
      labels: [],
    },
  });

  const type = watch("type");
  const assignee = watch("assignee");
  const priority = watch("priority");

  // Once priorities load, replace the bucket-shaped default with the real
  // id of the first priority in that bucket. After this runs the dropdown
  // matches exactly one row.
  useEffect(() => {
    if (!priorities || priorities.length === 0) return;
    const isAlreadyId = priorities.some((p) => String(p.id) === String(priority));
    if (isAlreadyId) return;
    const matchByBucket = priorities
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .find((p) => p.bucket === priority);
    if (matchByBucket) {
      setValue("priority", String(matchByBucket.id));
    }
  }, [priorities, priority, setValue]);
  const points = watch("points");
  const pointsHref = watch("pointsHref");
  const sprint = watch("sprint");
  const epicId = watch("epic");

  // Derive a story-points schema from any task whose type matches — its
  // schemaHref tells us whether SP is a CustomOption (t-shirt sizes) or
  // numeric, and exposes the option list either via allowedValues or via
  // sample-WP discovery on the schema route. Falls back to any task, then
  // null (renders the legacy numeric picker).
  const schemaHref = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return (
      list.find((t) => t.type === type)?.schemaHref ||
      list[0]?.schemaHref ||
      null
    );
  }, [tasks, type]);
  const schemaQ = useWpSchema(schemaHref);
  const spField =
    schemaQ.data?.fields?.[
      process.env.NEXT_PUBLIC_OPENPROJECT_STORY_POINTS_FIELD || "customField7"
    ];
  const spIsCustomOption = spField?.type === "CustomOption";
  const spOptionsQ = useCustomOptions(
    spField?.allowedValuesHref,
    !!spField?.allowedValuesHref,
  );
  const spOptions = spOptionsQ.data || spField?.allowedValues || null;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSubmit = (values) => {
    const labelNames = values.labels || [];
    const categoryIds = categories
      .filter((c) => labelNames.includes(c.name))
      .map((c) => c.id);
    const sp = spIsCustomOption
      ? { pointsHref: values.pointsHref || null }
      : { points: values.points ?? null };
    onCreate({
      ...values,
      ...sp,
      status: values.status || "todo",
      categoryIds,
    });
    if (createMore) {
      reset({ ...values, title: "", description: "" });
    } else {
      onClose();
    }
  };

  const selectedAssignee = assignee
    ? (Array.isArray(assignees) ? assignees : []).find(
        (p) => String(p.id) === String(assignee),
      ) ||
      PEOPLE[assignee] ||
      { id: assignee, name: "Assignee" }
    : null;

  const selectedSprint = sprint
    ? sprints.find((s) => s.id === sprint)?.name || null
    : null;

  const selectedEpic = epicId
    ? epics.find((e) => String(e.id) === String(epicId))
    : null;

  const selectedTag = (watch("labels") || [])[0] || null;

  const pointsLabel = spIsCustomOption
    ? (spOptions || []).find(
        (o) => o.href === pointsHref || o.id === pointsHref,
      )?.value || null
    : points || null;

  const priorityRecord =
    (priorities || []).find((p) => String(p.id) === String(priority)) ||
    (priorities || []).find((p) => p.bucket === priority) ||
    null;
  const priorityLabel = priorityRecord?.name || priority || "";
  const priorityBucket = priorityRecord?.bucket || (typeof priority === "string" ? priority : "medium");

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-4 sm:p-6 scrim animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }
        }}
        className="bg-surface-elevated rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-32px)] animate-slide-up"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border-soft">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-fg-faint mb-1.5">
              {projectName} · New work package
            </div>
            <TypeStrip
              types={types}
              value={type}
              onChange={(v) => setValue("type", v, { shouldValidate: true })}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-8 h-8 -mr-1 rounded-md text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer"
          >
            <Icon name="x" size={14} aria-hidden="true" />
          </button>
        </header>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Title (hero) */}
          <input
            autoFocus
            placeholder="What needs to be done?"
            className={TITLE_INPUT}
            {...register("title")}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <div className="text-pri-highest text-[12px] mt-1">{errors.title.message}</div>
          )}

          {/* Description */}
          <textarea
            placeholder="Add context, acceptance criteria, or links… (optional)"
            rows={4}
            className={`${DESC_TEXTAREA} mt-3`}
            {...register("description")}
          />

          {/* Details */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                Details
              </span>
              <span className="flex-1 h-px bg-border-soft" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              {/* Assignee */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="people" size={13} aria-hidden="true" />
                  Assignee
                </span>
                <button
                  type="button"
                  className={ROW_VALUE}
                  onClick={(e) =>
                    setAssignMenu(e.currentTarget.getBoundingClientRect())
                  }
                >
                  {selectedAssignee ? (
                    <>
                      <Avatar user={selectedAssignee} size="sm" />
                      <span className="truncate">{selectedAssignee.name}</span>
                    </>
                  ) : (
                    <span className={ROW_PLACEHOLDER}>Unassigned</span>
                  )}
                  <Icon
                    name="chev-down"
                    size={11}
                    className="ml-auto text-fg-subtle shrink-0"
                    aria-hidden="true"
                  />
                </button>
                {assignMenu && (
                  <Menu
                    anchorRect={assignMenu}
                    onClose={() => setAssignMenu(null)}
                    onSelect={(it) => setValue("assignee", it.value)}
                    searchable
                    searchPlaceholder="Search people…"
                    width={240}
                    items={[
                      { label: "Unassigned", value: null, active: !assignee },
                      ...(currentUser?.id
                        ? [
                            {
                              label: "Assign to me",
                              value: currentUser.id,
                              avatar: currentUser,
                            },
                          ]
                        : []),
                      { divider: true },
                      ...(Array.isArray(assignees) ? assignees : []).map((p) => ({
                        label: p.name,
                        value: p.id,
                        avatar: p,
                        active: String(p.id) === String(assignee),
                      })),
                    ]}
                  />
                )}
              </div>

              {/* Priority */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="flag" size={13} aria-hidden="true" />
                  Priority
                </span>
                <button
                  type="button"
                  className={ROW_VALUE}
                  onClick={(e) =>
                    setPriorityMenu(e.currentTarget.getBoundingClientRect())
                  }
                >
                  <PriorityIcon priority={priorityBucket} size={13} />
                  <span className="truncate">{priorityLabel || "Select"}</span>
                  <Icon
                    name="chev-down"
                    size={11}
                    className="ml-auto text-fg-subtle shrink-0"
                    aria-hidden="true"
                  />
                </button>
                {priorityMenu && (
                  <Menu
                    anchorRect={priorityMenu}
                    onClose={() => setPriorityMenu(null)}
                    onSelect={(it) => setValue("priority", it.value)}
                    items={(priorities || [])
                      .slice()
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      .map((p) => ({
                        label: p.name,
                        value: String(p.id),
                        swatch: p.color || `var(--pri-${p.bucket || "medium"})`,
                        active: String(p.id) === String(priority),
                      }))}
                  />
                )}
              </div>

              {/* Story points */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="chart" size={13} aria-hidden="true" />
                  {spField?.name || "Points"}
                </span>
                <button
                  type="button"
                  className={ROW_VALUE}
                  onClick={(e) =>
                    setPointsMenu(e.currentTarget.getBoundingClientRect())
                  }
                >
                  {pointsLabel ? (
                    <span className="truncate">{pointsLabel}</span>
                  ) : (
                    <span className={ROW_PLACEHOLDER}>Not estimated</span>
                  )}
                  <Icon
                    name="chev-down"
                    size={11}
                    className="ml-auto text-fg-subtle shrink-0"
                    aria-hidden="true"
                  />
                </button>
                {pointsMenu && (
                  <Menu
                    anchorRect={pointsMenu}
                    onClose={() => setPointsMenu(null)}
                    onSelect={(it) => {
                      if (spIsCustomOption) {
                        setValue("pointsHref", it.value);
                        setValue(
                          "points",
                          it.label === "Not estimated" ? null : it.label,
                        );
                      } else {
                        setValue("points", it.value);
                      }
                    }}
                    items={
                      spIsCustomOption
                        ? [
                            { label: "Not estimated", value: null },
                            { divider: true },
                            ...((spOptions || []).map((o) => ({
                              label: o.value,
                              value: o.href || o.id,
                              active: o.href === pointsHref || o.id === pointsHref,
                            }))),
                          ]
                        : [
                            { label: "Not estimated", value: null },
                            { divider: true },
                            ...[1, 2, 3, 5, 8, 13, 21].map((n) => ({
                              label: String(n),
                              value: n,
                              active: n === points,
                            })),
                          ]
                    }
                  />
                )}
              </div>

              {/* Sprint */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="sprint" size={13} aria-hidden="true" />
                  Sprint
                </span>
                <button
                  type="button"
                  className={ROW_VALUE}
                  onClick={(e) =>
                    setSprintMenu(e.currentTarget.getBoundingClientRect())
                  }
                >
                  {selectedSprint ? (
                    <span className="truncate">{selectedSprint}</span>
                  ) : (
                    <span className={ROW_PLACEHOLDER}>Select</span>
                  )}
                  <Icon
                    name="chev-down"
                    size={11}
                    className="ml-auto text-fg-subtle shrink-0"
                    aria-hidden="true"
                  />
                </button>
                {sprintMenu && (
                  <Menu
                    anchorRect={sprintMenu}
                    onClose={() => setSprintMenu(null)}
                    onSelect={(it) => setValue("sprint", it.value)}
                    items={sprints.map((s) => ({
                      label: s.name,
                      value: s.id,
                      active: s.id === sprint,
                    }))}
                  />
                )}
              </div>

              {/* Parent epic */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="epic" size={13} aria-hidden="true" />
                  Parent
                </span>
                <button
                  type="button"
                  className={ROW_VALUE}
                  onClick={(e) =>
                    setEpicMenu(e.currentTarget.getBoundingClientRect())
                  }
                >
                  {selectedEpic ? (
                    <>
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: selectedEpic.color || "var(--accent)" }}
                      />
                      <span className="truncate">{selectedEpic.title}</span>
                    </>
                  ) : (
                    <span className={ROW_PLACEHOLDER}>None</span>
                  )}
                  <Icon
                    name="chev-down"
                    size={11}
                    className="ml-auto text-fg-subtle shrink-0"
                    aria-hidden="true"
                  />
                </button>
                {epicMenu && (
                  <Menu
                    anchorRect={epicMenu}
                    onClose={() => setEpicMenu(null)}
                    onSelect={(it) => setValue("epic", it.value)}
                    items={[
                      { label: "None", value: null, active: !epicId },
                      { divider: true },
                      ...epics.map((e) => ({
                        label: e.title || e.name,
                        value: String(e.id),
                        swatch: e.color || "var(--accent)",
                        active: String(e.id) === String(epicId),
                      })),
                    ]}
                  />
                )}
              </div>

              {/* Tag (single category) */}
              <div className={ROW}>
                <span className={ROW_LABEL}>
                  <Icon name="tag" size={13} aria-hidden="true" />
                  Tag
                </span>
                <Controller
                  control={control}
                  name="labels"
                  render={({ field }) => {
                    const sel = field.value?.[0] || null;
                    return (
                      <>
                        <button
                          type="button"
                          className={ROW_VALUE}
                          onClick={(e) =>
                            setLabelMenu(e.currentTarget.getBoundingClientRect())
                          }
                        >
                          {sel ? (
                            <TagPill name={sel} size="xs" />
                          ) : (
                            <span className={ROW_PLACEHOLDER}>None</span>
                          )}
                          <Icon
                            name="chev-down"
                            size={11}
                            className="ml-auto text-fg-subtle shrink-0"
                            aria-hidden="true"
                          />
                        </button>
                        {labelMenu && (
                          <Menu
                            anchorRect={labelMenu}
                            onClose={() => setLabelMenu(null)}
                            searchable={(categories?.length || 0) > 6}
                            searchPlaceholder="Search tags…"
                            onSelect={(it) =>
                              field.onChange(it.value ? [it.value] : [])
                            }
                            items={
                              categories.length > 0
                                ? [
                                    { label: "None", value: null, active: !sel },
                                    ...categories.map((c) => ({
                                      label: c.name,
                                      value: c.name,
                                      active: c.name === sel,
                                    })),
                                  ]
                                : [
                                    {
                                      label: "(no tags in this project)",
                                      value: null,
                                      disabled: true,
                                    },
                                  ]
                            }
                          />
                        )}
                      </>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="flex items-center gap-3 px-5 py-3 border-t border-border bg-surface-subtle rounded-b-2xl">
          <label className="inline-flex items-center gap-2 text-[12.5px] text-fg-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={createMore}
              onChange={(e) => setCreateMore(e.target.checked)}
              className="accent-accent"
            />
            Create another
          </label>
          <span className="hidden sm:inline-flex items-center gap-1 ml-auto text-[11px] text-fg-faint">
            <kbd className="font-mono px-1.5 py-px rounded border border-border bg-surface-elevated text-fg-subtle">
              ⌘
            </kbd>
            <kbd className="font-mono px-1.5 py-px rounded border border-border bg-surface-elevated text-fg-subtle">
              ↵
            </kbd>
            to create
          </span>
          <div className="flex gap-2 sm:ml-3 ml-auto">
            <button
              type="button"
              className="inline-flex items-center h-8 px-3 rounded-md border border-border bg-surface-elevated text-fg text-[13px] font-medium hover:bg-surface-subtle hover:border-border-strong"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center h-8 px-3.5 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 hover:border-accent-600 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
