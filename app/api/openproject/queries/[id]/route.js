import { opFetch } from "@/lib/openproject/client";
import { mapQuery, elementsOf, mapWorkPackage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/queries/<id>?execute=1
//
// Returning the query metadata is the default; with ?execute=1, also return
// the query results (work packages flattened through mapWorkPackage). This
// keeps the page-level fetch to a single round trip.
export async function GET(req, ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const execute = url.searchParams.get("execute") === "1";
    const q = await opFetch(`/queries/${id}`);
    const mapped = mapQuery(q);
    if (!execute) return Response.json(mapped);

    // OP embeds the result set under `_embedded.results._embedded.elements`
    // when the query is executed via `?showHierarchies=false&...`. Easier:
    // call the embedded results link directly if present, else fall back to
    // the query's own `?showHierarchies=false` rerun.
    const resultsLink = q._links?.results?.href || `/queries/${id}/results`;
    // The href is already API-prefixed; opFetch expects the path *after*
    // /api/v3, so strip that prefix if present.
    const stripped = resultsLink.replace(/^\/api\/v3/, "");
    const hal = await opFetch(stripped);
    const elements = elementsOf(hal);
    const results = elements.map((wp) => mapWorkPackage(wp));
    return Response.json({ ...mapped, results });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/openproject/queries/<id>
// Body: any subset of { name, public, filters, sortBy, columns, groupBy }
//
// Queries have no lockVersion — straight PATCH.
export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.public !== undefined) body.public = !!data.public;
    if (data.filters !== undefined) body.filters = data.filters;
    if (data.sortBy !== undefined) body.sortBy = data.sortBy;
    if (data.groupBy !== undefined) body.groupBy = data.groupBy;
    if (Array.isArray(data.columns)) {
      body._links = {
        columns: data.columns.map((c) => ({ href: `/api/v3/queries/columns/${c}` })),
      };
    }
    const updated = await opFetch(`/queries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapQuery(updated));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/queries/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
