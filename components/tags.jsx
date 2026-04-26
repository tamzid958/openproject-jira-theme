"use client";

import { useMemo, useState } from "react";
import { Tag as TagLucide } from "lucide-react";
import { TagPill } from "@/components/ui/tag-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPill } from "@/components/ui/loading-pill";
import { Icon } from "@/components/icons";
import { useApiStatus } from "@/lib/hooks/use-openproject";
import {
  useAvailableAssignees,
  useCategories,
} from "@/lib/hooks/use-openproject-detail";
import { friendlyError } from "@/lib/api-client";

// The OpenProject v3 API exposes categories as **read-only**:
// only GET /api/v3/(projects/{id}/)categories exists. There is no
// POST/PATCH/DELETE — every link in the CategoryModel is `readOnly`.
// So this page is a richly-browsable view of the categories that
// already exist in OpenProject; create/edit/delete must happen in OP's
// own Project settings → Work package categories page (we deep-link
// there for convenience).

const SORTS = [
  { id: "usage", label: "Most used" },
  { id: "name", label: "A → Z" },
  { id: "unused", label: "Unused first" },
];

function statusCounts(tasks) {
  const acc = { todo: 0, progress: 0, review: 0, done: 0, blocked: 0 };
  for (const t of tasks) {
    const k = t.status || "todo";
    acc[k] = (acc[k] || 0) + 1;
  }
  return acc;
}

function StatusBar({ counts, total }) {
  // Single horizontal stack showing the proportion of issues per
  // status. Cleaner than four separate count chips and gives an
  // at-a-glance health read.
  if (total === 0) return null;
  const order = ["todo", "progress", "review", "done", "blocked"];
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-surface-muted">
        {order.map((k) => {
          const v = counts[k] || 0;
          if (!v) return null;
          return (
            <span
              key={k}
              title={`${k}: ${v}`}
              className={`h-full ${
                k === "todo"
                  ? "bg-status-todo-bg"
                  : k === "progress"
                  ? "bg-status-progress"
                  : k === "review"
                  ? "bg-status-review-bg"
                  : k === "done"
                  ? "bg-status-done"
                  : "bg-status-blocked"
              }`}
              style={{ width: `${(v / total) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 text-[10.5px] text-fg-subtle">
        {counts.done > 0 && (
          <span title="Done">
            <span className="font-mono">{counts.done}</span>/{total} done
          </span>
        )}
      </div>
    </div>
  );
}

export function Tags({ projectId, projectName, tasks, onTaskClick, onFilter }) {
  const categoriesQ = useCategories(projectId);
  const assigneesQ = useAvailableAssignees(projectId);
  const status = useApiStatus();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("usage");

  const tagsWithCounts = useMemo(() => {
    const cats = categoriesQ.data || [];
    const enriched = cats.map((c) => {
      const used = tasks.filter((t) => (t.labels || []).includes(c.name));
      return { ...c, count: used.length, tasks: used, counts: statusCounts(used) };
    });
    const filtered = query.trim()
      ? enriched.filter((c) =>
          c.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : enriched;
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "unused") {
        if (a.count !== b.count) return a.count - b.count;
        return a.name.localeCompare(b.name);
      }
      // usage default
      return b.count - a.count || a.name.localeCompare(b.name);
    });
  }, [categoriesQ.data, tasks, query, sort]);

  const totalUsage = useMemo(
    () => tagsWithCounts.reduce((s, t) => s + t.count, 0),
    [tagsWithCounts],
  );
  const unusedCount = useMemo(
    () => tagsWithCounts.filter((t) => t.count === 0).length,
    [tagsWithCounts],
  );

  const opLink = (() => {
    const base = status.data?.baseUrl;
    if (!base || !projectId) return null;
    return `${base}/projects/${encodeURIComponent(projectId)}/settings/categories`;
  })();

  const renderAssignee = (cat) => {
    if (!cat.defaultAssignee) return null;
    const list = assigneesQ.data || [];
    const u =
      list.find((x) => String(x.id) === String(cat.defaultAssignee)) ||
      (cat.defaultAssigneeName
        ? { id: cat.defaultAssignee, name: cat.defaultAssigneeName }
        : null);
    if (!u) return null;
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-fg-subtle"
        title={`Default assignee: ${u.name}`}
      >
        <Avatar user={u} size="sm" />
        <span className="truncate max-w-32">{u.name}</span>
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-1 py-2">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-fg m-0">Tags</h2>
            <p className="text-[13px] text-fg-subtle mt-1 m-0">
              Work-package categories in{" "}
              <strong>{projectName || "this project"}</strong>. The OpenProject
              API is read-only for categories, so create / rename / delete
              happen in OpenProject&apos;s settings.
            </p>
          </div>
          {opLink && (
            <a
              href={opLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-white text-[12px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong"
              title="Open category settings in OpenProject"
            >
              <Icon name="settings" size={12} aria-hidden="true" />
              Manage in OpenProject
            </a>
          )}
        </div>
      </header>

      <div className="bg-white border border-border rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-soft flex-wrap">
          <div className="relative">
            <Icon
              name="search"
              size={12}
              className="absolute left-2.5 top-2 text-fg-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags…"
              className="w-56 h-7 pl-7 pr-2 rounded-md border border-border bg-white text-[12.5px] text-fg outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]"
            />
          </div>
          <div className="inline-flex rounded-md border border-border bg-white p-0.5">
            {SORTS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSort(opt.id)}
                className={`inline-flex items-center h-6 px-2 rounded text-[11.5px] font-medium cursor-pointer ${
                  sort === opt.id
                    ? "bg-accent-50 text-accent-700"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[11.5px] text-fg-subtle">
            {tagsWithCounts.length}{" "}
            {tagsWithCounts.length === 1 ? "tag" : "tags"}
            {totalUsage > 0 && (
              <>
                {" · "}
                <span>{totalUsage} usage{totalUsage === 1 ? "" : "s"}</span>
              </>
            )}
            {unusedCount > 0 && (
              <>
                {" · "}
                <span className="text-fg-faint">{unusedCount} unused</span>
              </>
            )}
          </div>
        </div>

        {categoriesQ.isLoading ? (
          <div className="px-4 py-8 text-center">
            <LoadingPill label="loading tags" />
          </div>
        ) : categoriesQ.error ? (
          <div className="px-4 py-6 text-[13px] text-pri-highest">
            {friendlyError(categoriesQ.error, "Couldn't load tags.")}
          </div>
        ) : tagsWithCounts.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyState
              icon={TagLucide}
              title={query ? "No tags match your search" : "No tags yet"}
              body={
                query
                  ? "Try a different search term."
                  : "Create categories in OpenProject's project settings — they'll show up here automatically."
              }
              action={
                !query && opLink
                  ? {
                      label: "Open in OpenProject",
                      onClick: () => window.open(opLink, "_blank", "noopener"),
                    }
                  : null
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-soft">
            {tagsWithCounts.map((tag) => (
              <li key={tag.id} className="px-4 py-3 group">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TagPill name={tag.name} />
                    <span className="text-[12px] text-fg-subtle">
                      {tag.count} {tag.count === 1 ? "issue" : "issues"}
                    </span>
                    {renderAssignee(tag)}
                  </div>
                  {tag.count > 0 && onFilter && (
                    <button
                      type="button"
                      onClick={() => onFilter(tag.name)}
                      className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-white text-[11.5px] font-medium text-fg-muted hover:bg-surface-subtle hover:text-fg cursor-pointer transition-opacity"
                      title={`Filter Backlog by ${tag.name}`}
                    >
                      <Icon name="filter" size={11} aria-hidden="true" />
                      Filter
                    </button>
                  )}
                </div>
                {tag.count > 0 && (
                  <StatusBar counts={tag.counts} total={tag.count} />
                )}
                {tag.tasks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tag.tasks.slice(0, 6).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onTaskClick?.(t.id)}
                        className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border-soft bg-surface-subtle text-[11px] text-fg-muted hover:border-border-strong hover:text-fg transition-colors"
                        title={t.title}
                      >
                        <span className="font-mono text-[10px] text-fg-subtle">
                          {t.key}
                        </span>
                        <span className="truncate max-w-40">{t.title}</span>
                      </button>
                    ))}
                    {tag.tasks.length > 6 && (
                      <span className="text-[11px] text-fg-subtle self-center">
                        +{tag.tasks.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
