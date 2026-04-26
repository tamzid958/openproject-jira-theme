"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";

export function Dropzone({
  onFiles,
  multiple = true,
  hint,
  busy = false,
  label = "Drop files here or click to browse",
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const handle = (filesList) => {
    const files = Array.from(filesList || []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-4 py-6 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors text-[13px]",
        over
          ? "border-accent bg-accent-50 text-accent-700"
          : "border-border bg-surface-app text-fg-subtle hover:bg-surface-subtle hover:border-border-strong",
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
    >
      <Icon name="paperclip" size={18} aria-hidden="true" />
      <span>{busy ? "Uploading…" : label}</span>
      {hint && <span className="text-xs text-fg-faint">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
