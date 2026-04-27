// Client-safe constants for t-shirt sizing. The server-only resolver lives
// in story-points.js and must NOT be imported by client components.

export const T_SHIRT_TO_POINTS = {
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
};

export const T_SHIRT_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

// Display helper — prefer the natural label OpenProject sent us
// (a t-shirt size like "L" on a CustomOption field, or just the
// number on a native numeric field) over the converted number.
//
// The mapper produces:
//   task.points    → always numeric; "L" gets converted to 5
//   task.pointsRaw → the as-sent label ("L" / "5" / null)
//
// Aggregations (sprint totals, dashboard sums) should keep using
// `task.points`. Anything visible in chrome — board card, list
// row, swimlane meta — should call this so users see "L" instead
// of "5" on t-shirt-configured projects.
//
// Returns a string for display, or null if the task has no estimate.
export function formatPoints(task) {
  if (task == null) return null;
  if (task.pointsRaw != null && task.pointsRaw !== "") {
    return String(task.pointsRaw);
  }
  if (task.points != null) return String(task.points);
  return null;
}
