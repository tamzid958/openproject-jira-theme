import Link from "next/link";
import { CenterStatus } from "@/components/ui/center-status";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function NotFound() {
  return (
    <CenterStatus>
      <Eyebrow>404</Eyebrow>
      <DisplayHeading as="h2" size="md" italic className="mt-3">
        Lost in the workspace.
      </DisplayHeading>
      <p className="text-fg-muted mt-4 mb-6 text-[14px] leading-relaxed max-w-sm mx-auto">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center h-10 px-4 rounded-md bg-accent text-on-accent text-[13.5px] font-semibold transition-transform hover:-translate-y-px hover:bg-accent-600 shadow-(--card-highlight) no-underline"
      >
        Back to projects →
      </Link>
    </CenterStatus>
  );
}
