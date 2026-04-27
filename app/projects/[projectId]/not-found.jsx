import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function ProjectNotFound() {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="luxe-card max-w-md w-full p-7 sm:p-8 text-center">
        <Eyebrow tone="strong">Project</Eyebrow>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.022em] text-fg m-0 mt-2 mb-3">
          Not found
        </h2>
        <p className="text-fg-muted mb-6 text-[13.5px] leading-relaxed">
          The project doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-on-accent text-[13px] font-semibold transition-transform hover:-translate-y-px hover:bg-accent-600 no-underline"
        >
          Back to projects →
        </Link>
      </div>
    </div>
  );
}
