"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

const ERROR_COPY = {
  Configuration:
    "OAuth isn't configured yet. Set OPENPROJECT_OAUTH_CLIENT_ID, OPENPROJECT_OAUTH_CLIENT_SECRET, and AUTH_SECRET in your environment.",
  AccessDenied: "OpenProject denied the sign-in request.",
  Verification: "That sign-in link expired or was already used.",
  OAuthSignin: "Couldn't start the OAuth flow with OpenProject. Please try again.",
  OAuthCallback: "OpenProject redirected back, but the callback didn't complete. Please try again.",
  OAuthAccountNotLinked: "This OpenProject account isn't linked here yet.",
  RefreshAccessTokenError:
    "Your session expired and we couldn't renew it silently. Sign in again to continue.",
};

function humaniseError(code) {
  if (!code) return null;
  return ERROR_COPY[code] || `Couldn't sign in (${code}). Please try again.`;
}

export function SignInCard() {
  const params = useSearchParams();
  const error = humaniseError(params.get("error"));
  const next = params.get("callbackUrl") || params.get("next") || "/";
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    signIn("openproject", { callbackUrl: next });
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* Mobile-only brand mark — the desktop layout shows the full
          brand pane on the left, so we collapse to a tiny logo here
          to anchor the form without taking vertical space. */}
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-linear-to-br from-accent to-accent-700 text-white">
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
        <span className="font-display font-bold text-[17px] tracking-tight text-fg">
          Opira
        </span>
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-faint mb-2">
        Welcome back
      </div>
      <h2 className="font-display text-[28px] leading-tight tracking-[-0.02em] font-bold text-fg m-0 mb-2">
        Sign in to your workspace
      </h2>
      <p className="text-[14px] text-fg-muted leading-relaxed m-0 mb-7">
        Authenticate with your OpenProject account. We&apos;ll redirect you
        back here once you authorize.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-pri-highest/30 bg-pri-highest/5 text-pri-highest text-[13px] leading-relaxed px-3.5 py-3 mb-5"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={submitting}
          className="group w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-accent bg-accent text-white text-[14px] font-semibold shadow-[0_1px_0_rgba(15,23,41,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-accent-600 hover:border-accent-600 disabled:opacity-70 disabled:cursor-default"
        >
          {submitting ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              Continue with OpenProject
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-0.5"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-2 my-6 text-[11px] uppercase tracking-[0.14em] text-fg-faint">
        <span className="flex-1 h-px bg-border-soft" />
        OAuth 2.0 · PKCE
        <span className="flex-1 h-px bg-border-soft" />
      </div>

      <p className="text-[12px] text-fg-subtle leading-relaxed m-0">
        By continuing you authorize this app to act on your behalf in
        OpenProject. You can revoke access any time from your OpenProject
        account settings, and your access token never reaches the browser.
      </p>

      {/* Mobile-only "Crafted by" footer — desktop has a richer footer
          inside the brand pane on the left. */}
      <div className="lg:hidden mt-10 pt-5 border-t border-border-soft flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-faint leading-none mb-1">
            Crafted by
          </div>
          <div className="text-[12.5px] font-semibold text-fg leading-tight">
            Tamzid Ahmed
          </div>
        </div>
        <a
          href="https://github.com/tamzid958/opira"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
          className="grid place-items-center w-9 h-9 rounded-lg border border-border-soft bg-surface-elevated text-fg-subtle hover:bg-surface-subtle hover:text-fg hover:border-border-strong transition-all"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.04c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
