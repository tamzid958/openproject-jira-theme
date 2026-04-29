// Shared parsers for OpenProject activity-detail strings. The HAL feed
// emits version/sprint changes as marked-up text like
// "Version changed from *Sprint 1* to *Sprint 2*"; we don't get
// machine-readable property/old/new fields, so callers regex over the
// rendered detail text. Used by the burndown + carryover routes.

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip OP's HAL diff decorations: `*name*`, `_name_`, backticks, quotes.
export function stripDecor(s) {
  return String(s || "")
    .replace(/[`*_"']/g, "")
    .trim();
}

// "added" | "removed" | null for the given sprint, parsing one detail
// line. OP phrasings vary by locale: "Version set to X",
// "Version changed from X to Y". We match either "version" or "sprint"
// as the property name.
export function classifyVersionDetail(detail, sprintName) {
  if (!sprintName) return null;
  if (!/version|sprint/i.test(detail)) return null;
  const fromTo = detail.match(/from\s+(.+?)\s+to\s+(.+)$/i);
  if (fromTo) {
    const from = stripDecor(fromTo[1]);
    const to = stripDecor(fromTo[2]);
    if (to && to.includes(sprintName)) return "added";
    if (from && from.includes(sprintName)) return "removed";
    return null;
  }
  const setTo = detail.match(/set to\s+(.+)$/i);
  if (setTo) {
    const v = stripDecor(setTo[1]);
    if (v && v.includes(sprintName)) return "added";
    return null;
  }
  return null;
}

// Names from `closedNames` mentioned in `detail`. Used by carry-over
// detection: a WP currently in an open sprint is "carried over" when
// any closed sprint name appears in its activity history.
export function closedSprintMentions(detail, closedNames) {
  if (!/version|sprint/i.test(detail)) return [];
  const hits = [];
  for (const name of closedNames) {
    if (!name) continue;
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(name)}([^A-Za-z0-9]|$)`);
    if (re.test(detail)) hits.push(name);
  }
  return hits;
}
