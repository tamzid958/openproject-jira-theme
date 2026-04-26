"use client";

// Wraps a disabled control and shows a tooltip explaining why on hover/focus.
export function PermissionTooltip({
  allowed,
  message = "You don't have permission to do that.",
  children,
}) {
  if (allowed) return children;
  return (
    <span
      role="presentation"
      title={message}
      className="relative inline-flex group"
    >
      {children}
      <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-fg text-white text-[11px] whitespace-nowrap pointer-events-none opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 z-1100">
        {message}
      </span>
    </span>
  );
}

export default PermissionTooltip;
