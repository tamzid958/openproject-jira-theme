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
  type: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  assignee: z.string().nullable().optional(),
  priority: z.string(),
  points: z.union([z.number(), z.string()]).nullable().optional(),
  pointsHref: z.string().nullable().optional(),
  sprint: z.string().nullable().optional(),
  epic: z.string().nullable().optional(),
  labels: z.array(z.string()).default([]),
});

const PICKER =
  "flex items-center gap-2 w-full h-9 px-2.5 rounded-md border border-border bg-white text-[13px] text-fg cursor-pointer transition-colors hover:bg-surface-subtle hover:border-border-strong text-left";
const INPUT =
  "w-full h-9 px-3 rounded-md border border-border bg-white text-[13px] text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]";
const TEXTAREA =
  "w-full min-h-24 p-3 rounded-md border border-border bg-white text-[13px] text-fg leading-relaxed placeholder:text-fg-faint outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)] resize-y font-sans";
const LABEL = "block text-[12px] font-semibold text-fg-muted mb-1";

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
  const [typeMenu, setTypeMenu] = useState(null);
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
      type: "task",
      title: "",
      description: "",
      assignee: null,
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
  const points = watch("points");
  const pointsHref = watch("pointsHref");
  const sprint = watch("sprint");
  const epicId = watch("epic");

  // Derive a schema for the points picker. We pick the first existing
  // task whose type matches the selected type — its schemaHref tells us
  // whether story-points is a CustomOption (t-shirt sizes) or a numeric
  // field, and exposes the option list either via allowedValues or via
  // sample-WP discovery on the schema route. Fallback: any task in the
  // project, then null (renders the legacy numeric picker).
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
    // Decide which story-points shape to send:
    //   - CustomOption schema: pass `pointsHref` (tracks the chosen option),
    //     drop the numeric/label points fallback so the server doesn't try
    //     to coerce it.
    //   - Native numeric: pass `points` only.
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

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-6 bg-[rgba(15,23,41,0.45)] backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[calc(100vh-48px)] animate-slide-up"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <span className="text-xs text-fg-subtle">{projectName}</span>
          <h2 className="font-display text-lg font-bold text-fg m-0">Create issue</h2>
          <button
            type="button"
            className="ml-auto grid place-items-center w-8 h-8 rounded-md text-fg-subtle hover:bg-surface-subtle hover:text-fg"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={14} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 grid gap-4">
          <div>
            <label className={LABEL}>Issue type</label>
            {(() => {
              // The form value is now the *unique* OpenProject type id (or
              // bucket fallback when types haven't loaded). We render the
              // icon by looking the type up — bucket-shared types like
              // "Feature" and "User story" no longer collapse into a single
              // selectable item.
              const apiSel = (types || []).find((t) => String(t.id) === String(type));
              const selectedLabel = apiSel?.name || (typeof type === "string" ? type : "");
              const selectedBucket = apiSel?.bucket || "task";
              return (
                <button
                  type="button"
                  className={`${PICKER} max-w-45`}
                  onClick={(e) => setTypeMenu(e.currentTarget.getBoundingClientRect())}
                >
                  <TypeIcon type={selectedBucket} size={14} />
                  <span className="capitalize truncate">{selectedLabel || "Pick a type"}</span>
                  <Icon
                    name="chev-down"
                    size={12}
                    className="ml-auto text-fg-subtle"
                    aria-hidden="true"
                  />
                </button>
              );
            })()}
            {typeMenu && (
              <Menu
                anchorRect={typeMenu}
                onClose={() => setTypeMenu(null)}
                onSelect={(it) => setValue("type", it.value)}
                items={(types || [])
                  .slice()
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((t, idx) => {
                    const idMatch = String(t.id) === String(type);
                    // On first render `type` may still hold the bucket
                    // string ("task"). Mark only the first type with
                    // that bucket as active so we never light up two
                    // rows simultaneously.
                    const bucketMatch =
                      !idMatch &&
                      t.bucket === type &&
                      idx === types.findIndex((x) => x.bucket === type);
                    return {
                      label: t.name,
                      value: String(t.id),
                      active: idMatch || bucketMatch,
                    };
                  })}
              />
            )}
          </div>

          <div>
            <label className={LABEL}>
              Summary <span className="text-pri-highest">*</span>
            </label>
            <input
              autoFocus
              placeholder="Concise, action-oriented title"
              className={INPUT}
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <div className="text-pri-highest text-xs mt-1">{errors.title.message}</div>
            )}
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea
              placeholder="Add context, acceptance criteria, or links…"
              className={TEXTAREA}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Assignee</label>
              <button
                type="button"
                className={PICKER}
                onClick={(e) => setAssignMenu(e.currentTarget.getBoundingClientRect())}
              >
                {(() => {
                  const u = assignee
                    ? (Array.isArray(assignees) ? assignees : []).find(
                        (p) => String(p.id) === String(assignee),
                      ) ||
                      PEOPLE[assignee] ||
                      { id: assignee, name: "Assignee" }
                    : null;
                  return (
                    <>
                      <Avatar user={u} size="sm" />
                      <span className="truncate">{u ? u.name : "Unassigned"}</span>
                    </>
                  );
                })()}
                <Icon
                  name="chev-down"
                  size={12}
                  className="ml-auto text-fg-subtle"
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

            <div>
              <label className={LABEL}>Priority</label>
              <button
                type="button"
                className={PICKER}
                onClick={(e) => setPriorityMenu(e.currentTarget.getBoundingClientRect())}
              >
                <PriorityIcon priority={priority} size={14} />
                <span className="capitalize truncate">{priority}</span>
                <Icon
                  name="chev-down"
                  size={12}
                  className="ml-auto text-fg-subtle"
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
                      value: p.bucket || p.id,
                      swatch: p.color || `var(--pri-${p.bucket || "medium"})`,
                      active: (p.bucket || p.id) === priority,
                    }))}
                />
              )}
            </div>

            <div>
              <label className={LABEL}>
                {spField?.name || "Story points"}
              </label>
              <button
                type="button"
                className={PICKER}
                onClick={(e) => setPointsMenu(e.currentTarget.getBoundingClientRect())}
              >
                <span className="truncate">
                  {spIsCustomOption
                    ? (spOptions || []).find(
                        (o) => o.href === pointsHref || o.id === pointsHref,
                      )?.value || "Not estimated"
                    : points || "Not estimated"}
                </span>
                <Icon
                  name="chev-down"
                  size={12}
                  className="ml-auto text-fg-subtle"
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
                      setValue("points", it.label === "Not estimated" ? null : it.label);
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
                            active:
                              o.href === pointsHref || o.id === pointsHref,
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

            <div>
              <label className={LABEL}>Sprint</label>
              <button
                type="button"
                className={PICKER}
                onClick={(e) => setSprintMenu(e.currentTarget.getBoundingClientRect())}
              >
                <Icon name="sprint" size={13} className="text-accent" aria-hidden="true" />
                <span className="truncate">
                  {sprint
                    ? sprints.find((s) => s.id === sprint)?.name?.split(" — ")[0] || "Sprint"
                    : "Without sprint"}
                </span>
                <Icon
                  name="chev-down"
                  size={12}
                  className="ml-auto text-fg-subtle"
                  aria-hidden="true"
                />
              </button>
              {sprintMenu && (
                <Menu
                  anchorRect={sprintMenu}
                  onClose={() => setSprintMenu(null)}
                  onSelect={(it) => setValue("sprint", it.value)}
                  items={[
                    { label: "Without sprint", value: null, active: !sprint },
                    { divider: true },
                    ...sprints.map((s) => ({
                      label:
                        s.name.split(" — ")[0] +
                        (s.state === "active" ? " (active)" : ""),
                      value: s.id,
                      active: s.id === sprint,
                    })),
                  ]}
                />
              )}
            </div>

            <div>
              <label className={LABEL}>Epic</label>
              <button
                type="button"
                className={PICKER}
                onClick={(e) => setEpicMenu(e.currentTarget.getBoundingClientRect())}
              >
                {epicId ? (
                  <>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        background:
                          epics.find((e) => String(e.id) === String(epicId))?.color ||
                          "var(--accent)",
                      }}
                    />
                    <span className="truncate">
                      {epics.find((e) => String(e.id) === String(epicId))?.title || "Epic"}
                    </span>
                  </>
                ) : (
                  <span className="text-fg-faint">None</span>
                )}
                <Icon
                  name="chev-down"
                  size={12}
                  className="ml-auto text-fg-subtle"
                  aria-hidden="true"
                />
              </button>
              {epicMenu && (
                <Menu
                  anchorRect={epicMenu}
                  onClose={() => setEpicMenu(null)}
                  onSelect={(it) => setValue("epic", it.value)}
                  items={[
                    { label: "None", value: null },
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

            <div>
              <label className={LABEL}>Tag</label>
              {/* Per the OP v3 spec a WP has at most one category. The
                  form field stores a 0-or-1 element array under `labels`
                  for back-compat; on submit the first entry becomes the
                  single category id. */}
              <Controller
                control={control}
                name="labels"
                render={({ field }) => {
                  const selected = field.value?.[0] || null;
                  return (
                    <>
                      <button
                        type="button"
                        className={PICKER}
                        onClick={(e) => setLabelMenu(e.currentTarget.getBoundingClientRect())}
                      >
                        {selected ? (
                          <TagPill name={selected} size="xs" />
                        ) : (
                          <span className="text-fg-faint">Add tag</span>
                        )}
                        <Icon
                          name="chev-down"
                          size={12}
                          className="ml-auto text-fg-subtle"
                          aria-hidden="true"
                        />
                      </button>
                      {labelMenu && (
                        <Menu
                          anchorRect={labelMenu}
                          onClose={() => setLabelMenu(null)}
                          searchable={(categories?.length || 0) > 6}
                          searchPlaceholder="Search tags…"
                          onSelect={(it) => {
                            field.onChange(it.value ? [it.value] : []);
                          }}
                          items={
                            categories.length > 0
                              ? [
                                  { label: "None", value: null, active: !selected },
                                  ...categories.map((c) => ({
                                    label: c.name,
                                    value: c.name,
                                    active: c.name === selected,
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

        <footer className="flex items-center gap-3 px-5 py-3 border-t border-border bg-surface-subtle rounded-b-xl">
          <label className="inline-flex items-center gap-2 text-[13px] text-fg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={createMore}
              onChange={(e) => setCreateMore(e.target.checked)}
              className="accent-accent"
            />
            Create another
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-white text-fg text-[13px] font-medium hover:bg-surface-subtle hover:border-border-strong"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 hover:border-accent-600 disabled:opacity-50"
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
