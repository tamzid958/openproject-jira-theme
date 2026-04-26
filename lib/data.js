// Live entity caches kept as module-level bindings so legacy components
// (Avatar, sidebar swatches, board cards) can read them synchronously
// without threading props through. They are populated by the project
// layout's `syncProjects` / `syncPeople` calls when TanStack Query data
// resolves; before then they're empty arrays / objects.

export const PROJECTS = [];
export const PEOPLE = {};

export function syncProjects(list) {
  PROJECTS.length = 0;
  if (Array.isArray(list)) PROJECTS.push(...list);
}

export function syncPeople(list) {
  for (const k of Object.keys(PEOPLE)) delete PEOPLE[k];
  if (Array.isArray(list)) for (const u of list) PEOPLE[u.id] = u;
}
