import Link from "next/link";
import { CenterStatus } from "@/components/ui/center-status";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function NotFound() {
  return (
    <CenterStatus>
      <Eyebrow tone="strong">404</Eyebrow>
      <h2 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0 mt-2 mb-3">
        Page not found
      </h2>
      <p className="text-fg-muted m-0 mb-6 text-[13.5px] leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-on-accent text-[13px] font-semibold transition-transform hover:-translate-y-px hover:bg-accent-600 no-underline"
      >
        Back to projects →
      </Link>
    </CenterStatus>
  );
}
