"use client";

// Client-side fetch wrapper used by every TanStack Query hook. Centralizes:
//   - JSON parsing (with non-JSON tolerance)
//   - structured error: throws an Error with `.status` and `.code` from the
//     route handler's `errorResponse({error, code, status})` payload
//   - friendly substitutions for 401/403 so per-mutation toasts read well
//   - one-shot redirect to /sign-in on REAUTH_REQUIRED (token revoked or
//     refresh failed). Guarded so we don't navigate twice in flight.

let redirected = false;

function triggerReauth() {
  if (redirected) return;
  if (typeof window === "undefined") return;
  redirected = true;
  const next = window.location.pathname + window.location.search;
  const url = `/sign-in?next=${encodeURIComponent(next)}`;
  // setTimeout 0 lets in-flight rendering settle before nav.
  setTimeout(() => {
    window.location.href = url;
  }, 0);
}

export async function fetchJson(url, opts) {
  const res = await fetch(url, { credentials: "same-origin", ...opts });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const code = body?.code || null;
    const status = body?.status || res.status;
    let message = body?.error || text || `Request failed (${status})`;
    if (status === 403) {
      message = "You don't have permission to do that.";
    } else if (code === "REAUTH_REQUIRED" || status === 401) {
      message = "Session expired — redirecting to sign in.";
      triggerReauth();
    } else if (code === "LOCK_CONFLICT") {
      message = "This item was changed by someone else — refreshing.";
    }
    const err = new Error(message);
    err.code = code;
    err.status = status;
    err.body = body;
    throw err;
  }
  return body;
}

// Friendly text for a thrown error. Preserves any pre-substituted message
// from fetchJson; falls back to a generic if `e` is something else.
export function friendlyError(e, fallback = "Something went wrong") {
  if (!e) return fallback;
  if (e.status === 403) return "You don't have permission to do that.";
  if (e.status === 404) return "That resource isn't available anymore.";
  if (e.status === 405 || e.status === 501) {
    return "Your OpenProject server doesn't support this action — manage it from OpenProject's project settings instead.";
  }
  if (e.status === 409 || e.code === "LOCK_CONFLICT") {
    return "Someone else updated this just now — refresh and try again.";
  }
  if (e.status === 422) {
    // 422 from OP usually carries a useful message — surface it but trim noise.
    const msg = (e.message || "").replace(/^OpenProject \d+:\s*/, "").trim();
    return msg || fallback;
  }
  if (e.code === "REAUTH_REQUIRED") return "Session expired — please sign in again.";
  return e.message || fallback;
}
