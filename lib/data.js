// Reference data for the prototype.
// Live entities (projects, people, sprints, epics) are empty at boot and
// populated from the OpenProject API via the sync helpers below. Components
// import these bindings directly and re-read them on each render — when App
// mutates the arrays in place after a query resolves, the next React render
// (triggered by the same query update) sees fresh values.

// ── Static UI tokens ──────────────────────────────────────────────────────
// These are tied to the legacy stylesheet (e.g., `.status-pill.todo`) and
// don't depend on the upstream OpenProject configuration.

export const STATUSES = [
  { id: "todo", name: "To Do", color: "todo" },
  { id: "progress", name: "In Progress", color: "progress" },
  { id: "review", name: "In Review", color: "review" },
  { id: "done", name: "Done", color: "done" },
];

export const PRIORITIES = [
  { id: "highest", name: "Highest", color: "var(--pri-highest)" },
  { id: "high", name: "High", color: "var(--pri-high)" },
  { id: "medium", name: "Medium", color: "var(--pri-medium)" },
  { id: "low", name: "Low", color: "var(--pri-low)" },
  { id: "lowest", name: "Lowest", color: "var(--pri-lowest)" },
];

export const TYPES = [
  { id: "task", name: "Task" },
  { id: "bug", name: "Bug" },
  { id: "story", name: "Story" },
  { id: "epic", name: "Epic" },
  { id: "subtask", name: "Sub-task" },
];

export const ACCENTS = {
  "#2563eb": { 600: "#1d4ed8", 700: "#1e40af", 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe" },
  "#7c3aed": { 600: "#6d28d9", 700: "#5b21b6", 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe" },
  "#0f172a": { 600: "#020617", 700: "#000000", 50: "#f1f5f9", 100: "#e2e8f0", 200: "#cbd5e1" },
  "#16a34a": { 600: "#15803d", 700: "#166534", 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0" },
  "#ea580c": { 600: "#c2410c", 700: "#9a3412", 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa" },
};

// ── Live data populated from the API ──────────────────────────────────────

export const PROJECTS = [];
export const PEOPLE = {};
export const SPRINTS = [];
export const EPICS = [];

// Comments / history are populated lazily when a task detail opens.
export const COMMENTS = {};
export const HISTORY = {};

export function syncProjects(list) {
  PROJECTS.length = 0;
  if (Array.isArray(list)) PROJECTS.push(...list);
}

export function syncPeople(list) {
  for (const k of Object.keys(PEOPLE)) delete PEOPLE[k];
  if (Array.isArray(list)) for (const u of list) PEOPLE[u.id] = u;
}

export function syncSprints(list) {
  SPRINTS.length = 0;
  if (Array.isArray(list)) SPRINTS.push(...list);
}

export function syncEpics(list) {
  EPICS.length = 0;
  if (Array.isArray(list)) EPICS.push(...list);
}
