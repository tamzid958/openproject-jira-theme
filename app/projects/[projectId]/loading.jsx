// Page-level skeleton — shown while a route segment's async work resolves.
// The project chrome (Topbar / Sidebar) is rendered by the layout, so this
// only fills the main content slot. Shape it like a typical page so the
// transition to real content doesn't visually "jump" in height.
export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col" aria-busy="true" aria-label="Loading">
      {/* Page header band */}
      <div className="bg-surface-elevated border-b border-border px-3 sm:px-6 pt-3.5 pb-3 shrink-0">
        <div className="h-7 w-48 rounded-md bg-surface-muted animate-pulse" />
      </div>

      {/* Body fills remaining height so content swap-in doesn't change layout */}
      <div className="flex-1 min-h-0 overflow-hidden px-3 sm:px-6 py-3 sm:py-4">
        <div className="h-full grid grid-rows-[auto_1fr] gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-28 rounded-md bg-surface-muted animate-pulse" />
            <div className="h-7 w-20 rounded-md bg-surface-muted animate-pulse" />
            <div className="ml-auto h-7 w-32 rounded-md bg-surface-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-h-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border-soft bg-surface-elevated p-3 flex flex-col gap-2 min-h-35"
              >
                <div className="h-4 w-24 rounded bg-surface-muted animate-pulse" />
                <div className="h-3 w-full rounded bg-surface-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-surface-muted animate-pulse" />
                <div className="mt-auto h-3 w-1/2 rounded bg-surface-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
