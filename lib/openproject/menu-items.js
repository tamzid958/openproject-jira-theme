// Menu-item builders shared by every place that lets the user pick a
// status, assignee, etc. These keep the JSX inside <Menu items={...}>
// short and consistent — Avatar/swatch shape, divider placement, the
// "Unassigned" sentinel, and active-state matching all live here.

export function statusMenuItems(statuses, currentStatusId) {
  return (statuses || [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => ({
      label: s.name,
      value: s.id,
      swatch: s.color || `var(--status-${s.bucket || "todo"})`,
      active: String(s.id) === String(currentStatusId),
    }));
}

export function assigneeMenuItems(currentAssigneeId, assignees, { includeUnassigned = true } = {}) {
  const list = Array.isArray(assignees) ? assignees : [];
  const items = list.map((p) => ({
    label: p.name,
    value: p.id,
    avatar: p,
    active: String(p.id) === String(currentAssigneeId),
  }));
  if (!includeUnassigned) return items;
  return [
    { label: "Unassigned", value: null, active: !currentAssigneeId },
    { divider: true },
    ...items,
  ];
}
