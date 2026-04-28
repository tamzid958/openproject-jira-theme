"use client";

import { CommentHtml } from "@/components/ui/comment-html";
import { LoadingPill } from "@/components/ui/loading-pill";
import { useWikiPage } from "@/lib/hooks/use-openproject";

export function WikiPageView({ id }) {
  const q = useWikiPage(id, !!id);

  if (q.isLoading) {
    return (
      <div className="grid place-items-center min-h-[40vh]">
        <LoadingPill label="loading wiki page" />
      </div>
    );
  }
  if (q.error) {
    return <div className="p-6 text-pri-highest">{String(q.error.message)}</div>;
  }
  const w = q.data;
  if (!w) return null;

  return (
    <article className="prose prose-sm max-w-3xl">
      <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em] text-fg m-0">
        {w.title}
      </h2>
      <div className="text-[12px] text-fg-subtle mt-1">
        {w.projectName ? <span>{w.projectName}</span> : null}
        {w.updatedAt ? <span> · updated {new Date(w.updatedAt).toLocaleDateString()}</span> : null}
      </div>
      <div className="mt-3">
        {w.html ? <CommentHtml html={w.html} /> : (
          <pre className="text-[13px] text-fg-muted whitespace-pre-wrap font-sans">{w.text}</pre>
        )}
      </div>
    </article>
  );
}
