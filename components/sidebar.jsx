"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { AllProjectsModal } from "@/components/all-projects-modal";
import { useOpenCounts } from "@/lib/hooks/use-openproject-detail";

const SB_ITEM =
  "flex items-center gap-2.5 h-9 px-3 mx-2 rounded-md text-[13px] font-medium text-fg-muted cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg no-underline";
const SB_ITEM_ACTIVE = "bg-accent-50 text-accent-700 hover:bg-accent-50 hover:text-accent-700";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "board", label: "Board", icon: "board" },
  { id: "backlog", label: "Backlog", icon: "backlog" },
  { id: "timeline", label: "Timeline", icon: "calendar" },
  { id: "documents", label: "Documents", icon: "paperclip" },
  { id: "reports", label: "Reports", icon: "chart" },
  { id: "tags", label: "Tags", icon: "tag" },
  { id: "members", label: "Members", icon: "people" },
];

function ProjectSwitcher({ anchor, projects, currentId, onClose, onShowAll }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const counts = useOpenCounts();

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchor?.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    const t = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const r = anchor?.getBoundingClientRect();
  const style = r ? { left: r.left, top: r.bottom + 4 } : {};
  const list = (projects || [])
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.key.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 12);

  return (
    <div
      ref={ref}
      style={style}
      className="fixed w-72 bg-white border border-border rounded-lg shadow-lg z-200 overflow-hidden animate-pop"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-soft">
        <Icon name="search" size={14} className="text-fg-subtle" aria-hidden="true" />
        <input
          autoFocus
          placeholder="Switch project…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none text-[13px] text-fg placeholder:text-fg-faint"
        />
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {list.map((p) => {
          const open = counts.data?.[p.id] ?? counts.data?.[p.identifier];
          const active = p.id === currentId;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}/board`}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-md cursor-pointer text-[13px] transition-colors no-underline ${
                active ? "bg-accent-50" : "hover:bg-surface-subtle"
              }`}
            >
              <span
                className="grid place-items-center w-6 h-6 rounded text-white text-[10px] font-bold shrink-0"
                style={{ background: p.color }}
              >
                {p.key}
              </span>
              <span className="flex-1 min-w-0">
                <div className="text-fg font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-fg-subtle">
                  {open != null ? `${open} open` : "—"}
                </div>
              </span>
              {active && (
                <Icon name="check" size={14} className="text-accent-700" aria-hidden="true" />
              )}
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="text-center py-4 text-[13px] text-fg-subtle">No projects match.</div>
        )}
      </div>
      <div className="border-t border-border-soft" />
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer text-[13px] text-fg-muted hover:bg-surface-subtle"
        onClick={() => {
          onClose();
          onShowAll?.();
        }}
      >
        <Icon name="folder" size={14} aria-hidden="true" />
        <span>View all projects…</span>
      </div>
    </div>
  );
}

export function Sidebar({ currentProjectId, projects = [], onSwitchProject, ...rest }) {
  const pathname = usePathname();
  const project = projects.find((p) => p.id === currentProjectId) || projects[0];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const switcherAnchor = useRef(null);

  if (!project) return null;

  // Match by suffix (`/<view>` or `/<view>/...`) so trailing search params and
  // nested routes still highlight the right item.
  const isActive = (id) => {
    const prefix = `/projects/${currentProjectId}/${id}`;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  return (
    <aside
      {...rest}
      className="row-start-2 row-end-3 col-start-1 col-end-2 bg-[#fbfbfd] border-r border-border overflow-y-auto py-3 flex flex-col"
    >
      <div className="px-2 pt-1">
        <button
          ref={switcherAnchor}
          type="button"
          onClick={() => setSwitcherOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md border border-transparent bg-transparent hover:bg-surface-subtle hover:border-border-soft transition-colors text-left"
        >
          <span
            className="grid place-items-center w-7 h-7 rounded-md text-white text-[11px] font-bold shrink-0"
            style={{ background: project.color }}
          >
            {project.key}
          </span>
          <span className="flex-1 min-w-0 text-[13px] font-semibold text-fg truncate">
            {project.name}
          </span>
          <Icon name="chev-down" size={14} className="text-fg-subtle" aria-hidden="true" />
        </button>
        {switcherOpen && (
          <ProjectSwitcher
            anchor={switcherAnchor.current}
            projects={projects}
            currentId={currentProjectId}
            onClose={() => {
              setSwitcherOpen(false);
              onSwitchProject?.();
            }}
            onShowAll={() => setAllOpen(true)}
          />
        )}
      </div>

      <nav className="mt-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={`/projects/${currentProjectId}/${item.id}`}
            className={[SB_ITEM, isActive(item.id) ? SB_ITEM_ACTIVE : ""].join(" ")}
          >
            <Icon name={item.icon} size={16} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Sidebar footer — credit card. Kept compact and visually quiet so
          it doesn't compete with the nav. The hairline above is rendered
          on a wrapper rather than the aside so it sits flush with the
          padding and doesn't extend into the scroll gutter. */}
      <div className="mt-auto px-3 pb-3.5 pt-4">
        <div className="border-t border-border-soft pt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-fg-faint leading-none mb-1">
              Crafted by
            </div>
            <div className="text-[12.5px] font-semibold text-fg leading-tight truncate">
              Tamzid Ahmed
            </div>
          </div>
          <a
            href="https://github.com/tamzid958/opira"
            target="_blank"
            rel="noopener noreferrer"
            title="View source on GitHub"
            aria-label="View source on GitHub"
            className="group grid place-items-center w-8 h-8 rounded-lg border border-border-soft bg-white text-fg-subtle shrink-0 transition-all hover:bg-surface-subtle hover:text-fg hover:border-border-strong hover:-translate-y-px"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="transition-transform group-hover:scale-110"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.04c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
        </div>
      </div>

      {allOpen && (
        <AllProjectsModal
          projects={projects}
          currentProjectId={currentProjectId}
          onSelect={() => setAllOpen(false)}
          onClose={() => setAllOpen(false)}
        />
      )}
    </aside>
  );
}
