"use client";

// Combine multiple React Query results into a single "ready / error" gate.
//
// `ready` flips to true only when every passed query has either resolved
// (data present, possibly stale) or errored. While any single query is in
// its first-fetch loading state, the gate stays closed — pages use this
// to render their content body once with fully-settled data instead of
// re-rendering as each query lands and showing partial UI in between.
//
// Disabled queries (enabled: false) are treated as ready: they're paused
// for a reason and would otherwise wedge the gate forever.
export function useQueriesSettled(...queries) {
  const ready = queries.every((q) => !q || !q.isLoading);
  const error = queries.find((q) => q?.error)?.error || null;
  return { ready, error };
}
