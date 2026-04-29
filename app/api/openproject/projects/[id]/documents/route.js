import { fetchAllPages, opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { mapDocument, mapProject } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// /api/v3/documents only supports offset/pageSize/sortBy — no filter
// param — so to deliver project-scoped documents we fetch and filter
// client-side. Bounded by `MAX_DOCS` so a workspace with thousands of
// documents doesn't pull all of them on every project view; tune via
// the `limit` query param if a project genuinely has more.
//
// We resolve the project's identifier→numeric id through GET /projects/
// so callers can pass either form in the URL — the mapper writes back
// both `projectId` (numeric) and `projectName` (title).
const MAX_DOCS = 500;

async function resolveProjectIdentities(idOrSlug) {
  try {
    const proj = await opFetch(`/projects/${encodeURIComponent(idOrSlug)}`);
    const mapped = mapProject(proj);
    return {
      numericId: String(proj?.id ?? idOrSlug),
      identifier: mapped?.id || String(idOrSlug),
    };
  } catch {
    return { numericId: String(idOrSlug), identifier: String(idOrSlug) };
  }
}

export async function GET(req, ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit"));
    const hardCap = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, 2000)
      : MAX_DOCS;
    const { numericId, identifier } = await resolveProjectIdentities(id);
    const items = await fetchAllPages("/documents", undefined, { hardCap });
    const filtered = items
      .map(mapDocument)
      .filter(Boolean)
      .filter(
        (d) =>
          String(d.projectId) === String(numericId) ||
          String(d.projectId) === String(identifier),
      )
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return Response.json(filtered);
  } catch (e) {
    return errorResponse(e);
  }
}
