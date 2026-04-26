"use client";

// Full-screen status surfaces (loader / error / "not configured" / "no
// projects") share a single centered card. Replaces the inline-styled
// CenteredCard family that lived in the old App shell.

export function CenterStatus({ children, narrow = false }) {
  return (
    <div className="grid place-items-center h-screen w-screen bg-surface-app p-6">
      <div
        className={`bg-surface-elevated border border-border rounded-xl shadow-md text-[14px] leading-relaxed text-fg p-7 ${
          narrow ? "max-w-md" : "max-w-lg"
        } w-full`}
      >
        {children}
      </div>
    </div>
  );
}

export function CenterLoader({ label = "Loading…" }) {
  return (
    <CenterStatus narrow>
      <div className="flex items-center gap-3 text-fg-muted">
        <span className="w-4 h-4 rounded-full border-2 border-accent-200 border-t-accent animate-spin" />
        {label}
      </div>
    </CenterStatus>
  );
}

export function CenterError({ title, message }) {
  return (
    <CenterStatus>
      <h2 className="font-display font-bold text-[18px] text-fg m-0 mb-2">
        {title}
      </h2>
      <pre className="bg-surface-subtle border border-border rounded-lg px-3 py-2.5 text-[12.5px] font-mono text-pri-highest whitespace-pre-wrap m-0">
        {message}
      </pre>
    </CenterStatus>
  );
}

export function CenterNotConfigured() {
  return (
    <CenterStatus>
      <h2 className="font-display font-bold text-[20px] text-fg m-0 mb-2">
        Connect to OpenProject
      </h2>
      <p className="text-fg-muted m-0 mb-4">
        Configure these env vars in <code>.env.local</code> and restart the dev server:
      </p>
      <pre className="bg-surface-subtle border border-border rounded-lg px-3 py-3 text-[12.5px] font-mono text-fg overflow-auto m-0">
        {`NEXT_PUBLIC_OPENPROJECT_URL=https://your-instance
OPENPROJECT_OAUTH_CLIENT_ID=...
OPENPROJECT_OAUTH_CLIENT_SECRET=...
AUTH_SECRET=...`}
      </pre>
    </CenterStatus>
  );
}
