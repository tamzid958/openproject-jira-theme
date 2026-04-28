import { opFetch } from "@/lib/openproject/client";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Returns the set of status ids this WP may transition to *for the current
// user*, according to OpenProject's role × type workflow matrix.
//
// Implementation detail: POSTing an empty body to the WP form endpoint is
// unreliable across OP versions — some installs don't compute the workflow
// transitions for `status._links.allowedValues` unless the payload echoes
// the WP's current `_links.status`. So we first GET the WP to learn its
// current status link, then POST that as the form payload. If the form
// still returns nothing for status (older OP, schema field locked, etc.)
// we return `ids: null` — the client treats that as "unknown" and falls
// back to letting the server reject invalid drops, instead of incorrectly
// blocking every column.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const nid = nativeId(id);
    const wp = await opFetch(`/work_packages/${nid}`);
    const statusHref = wp?._links?.status?.href || null;

    const formBody = statusHref ? { _links: { status: { href: statusHref } } } : {};
    const form = await opFetch(`/work_packages/${nid}/form`, {
      method: "POST",
      body: JSON.stringify(formBody),
    });

    const statusField = form?._embedded?.schema?.status || {};
    const ids = new Set();

    const linkValues = statusField?._links?.allowedValues;
    if (Array.isArray(linkValues)) {
      for (const link of linkValues) {
        const href = link?.href;
        if (typeof href === "string") {
          const m = href.match(/\/statuses\/([^/?#]+)/);
          if (m) ids.add(m[1]);
        }
      }
    }
    const embedded = statusField?._embedded?.allowedValues;
    if (Array.isArray(embedded)) {
      for (const s of embedded) if (s?.id != null) ids.add(String(s.id));
    }

    // If OP didn't surface any allowed values, don't claim "nothing is
    // allowed" — that would block every drop. Treat as unknown.
    if (ids.size === 0) {
      return Response.json({ ids: null });
    }
    return Response.json({ ids: [...ids] });
  } catch (e) {
    return errorResponse(e);
  }
}
