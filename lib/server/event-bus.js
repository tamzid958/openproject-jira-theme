import "server-only";

// In-process pub/sub used by Server Actions to fan out invalidation
// events to every connected SSE client (see `app/api/openproject/events/route.js`).
//
// Scope:
//   - Module-level Set of subscribers. Each subscriber is keyed by its
//     project filter so a client only hears events relevant to the
//     project it's currently viewing.
//   - This is a *single-process* bus. In a multi-instance deployment the
//     SSE stream still acts as live polling for the user's own actions
//     (their tab → server → their tab), but mutations made by another
//     user would only reach replicas that route the SSE through the
//     same instance. For the OP UI scope that's acceptable — TanStack
//     Query's existing window-focus refetch is the safety net for
//     cross-instance staleness.
//
// Event shape:
//   { type, projectId?, ids?, keys? }
//
// `keys` is a list of TanStack-Query key prefixes the client should
// invalidate. Lets the server tell the client *exactly* what to refetch
// instead of guessing on the client side.

const subscribers = new Set();

export function subscribe(filter, handler) {
  const entry = { filter, handler };
  subscribers.add(entry);
  return () => subscribers.delete(entry);
}

export function publish(event) {
  for (const { filter, handler } of subscribers) {
    if (filter.projectId && event.projectId && filter.projectId !== event.projectId) {
      continue;
    }
    try {
      handler(event);
    } catch {
      // Don't let a single broken subscriber kill fan-out.
    }
  }
}
