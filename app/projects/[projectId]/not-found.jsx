import Link from "next/link";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function ProjectNotFound() {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="luxe-card max-w-md w-full p-8 text-center">
        <Eyebrow>Project</Eyebrow>
        <DisplayHeading as="h2" size="md" italic className="mt-3">
          Not found.
        </DisplayHeading>
        <p className="text-fg-muted mt-4 mb-6 text-[14px] leading-relaxed">
          The project doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center h-9 px-4 rounded-md bg-accent text-accent-700 text-[13px] font-semibold transition-transform hover:-translate-y-px shadow-(--card-highlight) no-underline"
        >
          Back to projects →
        </Link>
      </div>
    </div>
  );
}
