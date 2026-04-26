"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignInCard() {
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("callbackUrl") || params.get("next") || "/";
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    signIn("openproject", { callbackUrl: next });
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 32,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--accent), var(--accent-600))",
            color: "white",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4 13 12l-8 8M19 4l-8 8 8 8" />
          </svg>
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>
          OpenProject
        </span>
      </div>

      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.01em" }}>
        Sign in
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--text-2)", lineHeight: 1.55 }}>
        Use your OpenProject account to sign into this workspace. You&apos;ll be
        redirected back here after authorizing.
      </p>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {humanizeError(error)}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            background: "var(--accent)",
            color: "white",
            border: 0,
            borderRadius: 8,
            padding: "11px 14px",
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.8 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitting ? "Redirecting…" : "Sign in with OpenProject"}
          {!submitting && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>

      <div
        style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: "1px solid var(--border-soft)",
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.55,
        }}
      >
        By signing in you authorize this app to act on your behalf in OpenProject.
        Revoke access any time from your OpenProject account settings.
      </div>
    </div>
  );
}

function humanizeError(code) {
  switch (code) {
    case "Configuration":
      return "OAuth isn't configured yet. Check OPENPROJECT_OAUTH_CLIENT_ID/SECRET and AUTH_SECRET.";
    case "AccessDenied":
      return "OpenProject denied the sign-in request.";
    case "Verification":
      return "Verification link expired or was already used.";
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthAccountNotLinked":
      return "Couldn't complete OAuth flow. Please try again.";
    default:
      return code;
  }
}
