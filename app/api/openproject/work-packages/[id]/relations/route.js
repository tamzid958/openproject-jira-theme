import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapRelation } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET — list relations involving this work package (both directions).
// OP v3 only exposes a global /relations collection; we filter by the
// `involved` operator so a single call captures both `from` and `to`.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const wpId = nativeId(id);
    const path = withQuery("/relations", {
      pageSize: "200",
      filters: buildFilters([
        { involved: { operator: "=", values: [String(wpId)] } },
      ]),
    });
    const hal = await opFetch(path);
    const list = elementsOf(hal)
      .map((r) => mapRelation(r, { wpId }))
      .filter(Boolean);
    return Response.json(list);
  } catch (e) {
    return errorResponse(e);
  }
}

// POST — create an outgoing relation FROM this WP TO another. The body is
// the v3 RelationWriteModel: `{ type, lag?, description?, _links.to }`.
export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const wpId = nativeId(id);
    const data = await req.json();
    if (!data?.type) {
      return Response.json({ error: "type is required" }, { status: 400 });
    }
    if (!data?.toId) {
      return Response.json({ error: "toId is required" }, { status: 400 });
    }
    const body = {
      type: data.type,
      _links: {
        to: { href: `/api/v3/work_packages/${nativeId(data.toId)}` },
      },
    };
    if (data.description != null) body.description = data.description;
    if (data.lag != null) body.lag = data.lag;
    const rel = await opFetch(`/work_packages/${wpId}/relations`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapRelation(rel, { wpId }));
  } catch (e) {
    return errorResponse(e);
  }
}
