"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { AllProjectsModal } from "@/components/all-projects-modal";
import { useOpenCounts } from "@/lib/hooks/use-openproject-detail";
import { PROJECTS } from "@/lib/data";

const SB_ITEM =
  "flex items-center gap-2.5 h-9 px-3 mx-2 rounded-md text-[13px] font-medium text-fg-muted cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg";
const SB_ITEM_ACTIVE = "bg-accent-50 text-accent-700 hover:bg-accent-50 hover:text-accent-700";

function ProjectSwitcher({ anchor, currentId, onSelect, onClose, onShowAll }) {
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
  const list = PROJECTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.key.toLowerCase().includes(q.toLowerCase()),
  ).slice(0, 12);

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
            <div
              key={p.id}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-md cursor-pointer text-[13px] transition-colors ${
                active ? "bg-accent-50" : "hover:bg-surface-subtle"
              }`}
              onClick={() => onSelect(p.id)}
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
            </div>
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

export function Sidebar({
  currentProjectId,
  onSelectProject,
  currentView,
  onSelectView,
  ...rest
}) {
  const project = PROJECTS.find((p) => p.id === currentProjectId) || PROJECTS[0];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const switcherAnchor = useRef(null);

  if (!project) return null;

  return (
    <aside
      {...rest}
      className="row-start-2 row-end-3 col-start-1 col-end-2 bg-[#fbfbfd] border-r border-border overflow-y-auto py-3 flex flex-col"
    >
      {/* Project switcher */}
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
            currentId={currentProjectId}
            onSelect={(id) => {
              onSelectProject(id);
              setSwitcherOpen(false);
            }}
            onClose={() => setSwitcherOpen(false)}
            onShowAll={() => setAllOpen(true)}
          />
        )}
      </div>

      {/* Nav */}
      <nav className="mt-4 flex flex-col gap-0.5">
        {[
          { id: "overview", label: "Overview", icon: "home" },
          { id: "board", label: "Board", icon: "board" },
          { id: "backlog", label: "Backlog", icon: "backlog" },
          { id: "timeline", label: "Timeline", icon: "calendar" },
          { id: "documents", label: "Documents", icon: "paperclip" },
          { id: "reports", label: "Reports", icon: "chart" },
        ].map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectView(item.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectView(item.id)}
            className={[SB_ITEM, currentView === item.id ? SB_ITEM_ACTIVE : ""].join(" ")}
          >
            <Icon name={item.icon} size={16} aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectView("tags")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectView("tags")}
          className={[SB_ITEM, currentView === "tags" ? SB_ITEM_ACTIVE : ""].join(" ")}
        >
          <Icon name="tag" size={16} aria-hidden="true" />
          <span>Tags</span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectView("members")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectView("members")}
          className={[SB_ITEM, currentView === "members" ? SB_ITEM_ACTIVE : ""].join(" ")}
        >
          <Icon name="people" size={16} aria-hidden="true" />
          <span>Members</span>
        </div>
      </nav>

      {allOpen && (
        <AllProjectsModal
          projects={PROJECTS}
          currentProjectId={currentProjectId}
          onSelect={onSelectProject}
          onClose={() => setAllOpen(false)}
        />
      )}
    </aside>
  );
}
