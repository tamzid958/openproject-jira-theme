"use client";

import { Icon } from "@/components/icons";

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-pri-highest text-[13px]"
    >
      <Icon name="flag" size={14} className="mt-px shrink-0" aria-hidden="true" />
      <div>{message}</div>
    </div>
  );
}
