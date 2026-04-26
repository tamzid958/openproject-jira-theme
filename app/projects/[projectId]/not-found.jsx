import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-xl shadow-md p-7 text-center">
        <h2 className="font-display font-bold text-[18px] text-fg m-0 mb-2">
          Project not found
        </h2>
        <p className="text-fg-muted m-0 mb-4 text-[13px]">
          The project doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 no-underline"
        >
          Back to projects
        </Link>
      </div>
    </div>
  );
}
