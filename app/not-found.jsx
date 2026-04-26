import Link from "next/link";
import { CenterStatus } from "@/components/ui/center-status";

export default function NotFound() {
  return (
    <CenterStatus>
      <h2 className="font-display font-bold text-[18px] text-fg m-0 mb-2">
        Page not found
      </h2>
      <p className="text-fg-muted m-0 mb-3 text-[13px]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 no-underline"
      >
        Back to projects
      </Link>
    </CenterStatus>
  );
}
