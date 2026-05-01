// Client-safe constants for t-shirt sizing. The server-only resolver lives
// in story-points.js and must NOT be imported by client components.

// Canonical t-shirt scale → Fibonacci-ish story points. Includes common
// extensions (3XL/4XL, XXS/3XS) and the descriptive aliases teams sometimes
// configure ("Tiny/Small/Medium/…") so a custom-option field outside the
// strictly-canonical set still carries a sensible numeric weight through
// every aggregation in the app. Anything outside this map still falls
// through to `null` (excluded from sums), which is the safer default than
// guessing — but the universe of "still works" labels is now much wider.
export const T_SHIRT_TO_POINTS = {
  // Canonical
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
  // Extra-small extensions
  XXS: 0.5,
  "2XS": 0.5,
  "3XS": 0.25,
  // Extra-large extensions
  XXXL: 21,
  "3XL": 21,
  "4XL": 34,
  "5XL": 55,
  // Descriptive aliases (case-insensitive at parse time)
  TINY: 1,
  SMALL: 2,
  MEDIUM: 3,
  LARGE: 5,
  HUGE: 8,
  MASSIVE: 13,
  EPIC: 21,
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
