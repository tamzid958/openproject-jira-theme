// Parent/child tree helpers for work-package lists.
//
// "Slice" semantics: callers pass a (filtered) list of tasks. By default,
// we only treat a parent reference as real when its parent is also in the
// slice — so a child whose parent was filtered out is exposed as a root,
// never silently dropped. Pass { filterToSlice: false } to index across
// the full task graph (used by the detail view's subtask breakdown, where
// the parent isn't necessarily in the same list).

export function buildChildIndex(list, { filterToSlice = true, sort = true } = {}) {
  const tasks = list || [];
  const ids = filterToSlice ? new Set(tasks.map((t) => String(t.nativeId))) : null;
  const idx = new Map();
  for (const t of tasks) {
    if (!t.epic) continue;
    if (ids && !ids.has(String(t.epic))) continue;
    const key = String(t.epic);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(t);
  }
  if (sort) {
    for (const arr of idx.values()) {
      arr.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    }
  }
  return idx;
}

export function rootsOf(list) {
  const tasks = list || [];
  const ids = new Set(tasks.map((t) => String(t.nativeId)));
  return tasks.filter((t) => !t.epic || !ids.has(String(t.epic)));
}

// Used by drag-end handlers to refuse drops that would create a cycle.
export function collectDescendantIds(rootNativeId, childIndex) {
  const out = new Set();
  const stack = [String(rootNativeId)];
  while (stack.length) {
    const cur = stack.pop();
    for (const k of childIndex.get(cur) || []) {
      const id = String(k.nativeId);
      if (out.has(id)) continue;
      out.add(id);
      stack.push(id);
    }
  }
  return out;
}

export function collectDescendantTasks(rootNativeId, childIndex) {
  const out = [];
  const seen = new Set();
  const stack = [String(rootNativeId)];
  while (stack.length) {
    const cur = stack.pop();
    for (const k of childIndex.get(cur) || []) {
      const id = String(k.nativeId);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(k);
      stack.push(id);
    }
  }
  return out;
}
