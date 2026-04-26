import { opFetchRaw } from "@/lib/openproject/client";

export const dynamic = "force-dynamic";

// Proxies the OpenProject user avatar image. OP's /api/v3/users/{id}/avatar
// endpoint requires the OAuth bearer token, so we can't link to it directly
// from <img src>. Stream it through here instead. Cached briefly by the
// browser to avoid hammering the upstream on busy boards.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const upstream = await opFetchRaw(`/users/${id}/avatar`);
    const headers = new Headers();
    const ct = upstream.headers.get("content-type") || "image/png";
    const cl = upstream.headers.get("content-length");
    headers.set("content-type", ct);
    if (cl) headers.set("content-length", cl);
    headers.set("cache-control", "private, max-age=300");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    // No avatar configured — falls through to initials in the UI.
    return new Response(null, { status: 404 });
  }
}
