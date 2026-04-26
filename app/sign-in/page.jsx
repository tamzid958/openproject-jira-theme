import { Suspense } from "react";
import { SignInCard } from "./sign-in-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — Opira",
};

// Split-pane sign-in. The left rail carries the brand identity and a few
// product talking points; the right column is a focused, minimal form.
// On mobile the form takes the whole viewport and the brand rail shrinks
// into a slim header so the call-to-action stays above the fold.
export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-surface-app grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <BrandPane />
      <main className="grid place-items-center px-5 py-10 lg:py-12 bg-white lg:bg-transparent">
        <Suspense fallback={null}>
          <SignInCard />
        </Suspense>
      </main>
    </div>
  );
}

function BrandPane() {
  return (
    <aside className="relative overflow-hidden hidden lg:flex flex-col justify-between p-12 text-white bg-[linear-gradient(135deg,var(--accent)_0%,var(--accent-700)_60%,#0b1730_100%)]">
      {/* Soft luminance blobs for depth, kept very low opacity so the
          surface still reads as one calm gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.55), transparent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.45), transparent)" }}
      />

      <header className="relative flex items-center gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 4 13 12l-8 8M19 4l-8 8 8 8" />
          </svg>
        </span>
        <span className="font-display font-bold text-[17px] tracking-tight">Opira</span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-white/60 ml-1 mt-0.5">
          for OpenProject
        </span>
      </header>

      <div className="relative max-w-md">
        <h1 className="font-display text-[44px] leading-[1.1] tracking-[-0.02em] font-bold m-0 mb-5">
          Plan, ship, repeat.
          <br />
          <span className="text-white/80">Your OpenProject, refined.</span>
        </h1>
        <p className="text-[15px] leading-relaxed text-white/75 m-0 mb-8 max-w-sm">
          A focused workspace for sprint-driven teams — built on top of the
          OpenProject API you already trust. Sign in with your existing
          account; nothing changes upstream.
        </p>

        <ul className="grid gap-3 max-w-sm">
          {[
            { title: "Sprint board with drag-and-drop", body: "Move work without losing context." },
            { title: "Backlog with bulk actions", body: "Plan a release in a few clicks." },
            { title: "Live OpenProject permissions", body: "What your team can do upstream is what they can do here." },
          ].map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="mt-1 grid place-items-center w-5 h-5 rounded-full bg-white/15 shrink-0">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <div>
                <div className="text-[14px] font-semibold leading-tight">{f.title}</div>
                <div className="text-[12.5px] text-white/65 leading-snug">{f.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <footer className="relative flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 leading-none mb-1.5">
            Crafted by
          </div>
          <div className="text-[14.5px] font-semibold leading-tight">Tamzid Ahmed</div>
        </div>
        <a
          href="https://github.com/tamzid958/opira"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
          className="group inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/15 text-[12.5px] font-medium transition-colors no-underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="transition-transform group-hover:scale-110"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.04c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
          Source on GitHub
        </a>
      </footer>
    </aside>
  );
}
