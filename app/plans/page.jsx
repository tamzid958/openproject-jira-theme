"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import { usePortfolios, usePrograms } from "@/lib/hooks/use-openproject";

export default function PlansIndexPage() {
  const programsQ = usePrograms(true);
  const portfoliosQ = usePortfolios(true);

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="bg-surface-elevated border-b border-border px-6 py-4">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.022em] text-fg m-0">
          Plans
        </h1>
        <p className="text-[13px] text-fg-subtle mt-1">
          Programs and portfolios — multi-project rollups configured in OpenProject.
        </p>
      </header>
      <main className="px-6 py-5 grid gap-6 max-w-5xl">
        <section>
          <h2 className="font-display text-[16px] font-bold text-fg mb-2">Programs</h2>
          {programsQ.isLoading && <LoadingPill label="loading programs" />}
          {!programsQ.isLoading && (programsQ.data?.length || 0) === 0 && (
            <div className="text-[13px] text-fg-subtle">No programs.</div>
          )}
          <div className="grid gap-2">
            {(programsQ.data || []).map((p) => (
              <Link
                key={p.id}
                href={`/plans/programs/${p.id}`}
                className="grid grid-cols-[24px_minmax(0,1fr)_120px] items-center gap-3 px-3 py-2.5 bg-surface-elevated border border-border rounded-lg hover:bg-surface-subtle no-underline"
              >
                <Icon name="folder" size={14} className="text-fg-subtle" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-semibold text-fg text-[13.5px] truncate">{p.name}</div>
                  <div className="text-[12px] text-fg-subtle truncate">
                    {p.projectIds.length} project{p.projectIds.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-[11px] text-fg-faint text-right">{p.status || ""}</span>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-display text-[16px] font-bold text-fg mb-2">Portfolios</h2>
          {portfoliosQ.isLoading && <LoadingPill label="loading portfolios" />}
          {!portfoliosQ.isLoading && (portfoliosQ.data?.length || 0) === 0 && (
            <div className="text-[13px] text-fg-subtle">No portfolios.</div>
          )}
          <div className="grid gap-2">
            {(portfoliosQ.data || []).map((p) => (
              <Link
                key={p.id}
                href={`/plans/portfolios/${p.id}`}
                className="grid grid-cols-[24px_minmax(0,1fr)_120px] items-center gap-3 px-3 py-2.5 bg-surface-elevated border border-border rounded-lg hover:bg-surface-subtle no-underline"
              >
                <Icon name="folder" size={14} className="text-fg-subtle" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-semibold text-fg text-[13.5px] truncate">{p.name}</div>
                  <div className="text-[12px] text-fg-subtle truncate">
                    {p.projectIds.length} project{p.projectIds.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-[11px] text-fg-faint text-right">{p.status || ""}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
