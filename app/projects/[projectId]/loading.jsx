import { LoadingPill } from "@/components/ui/loading-pill";

// Page-level skeleton — shown while a route segment's async work resolves.
// The project chrome (Topbar / Sidebar) is rendered by the layout, so this
// only fills the main content slot.
export default function Loading() {
  return (
    <div className="flex-1 grid place-items-center p-10">
      <LoadingPill label="loading" />
    </div>
  );
}
