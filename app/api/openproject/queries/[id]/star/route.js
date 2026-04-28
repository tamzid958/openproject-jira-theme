import { opFetch } from "@/lib/openproject/client";
import { mapQuery } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// PATCH /api/openproject/queries/<id>/star
// Body: { starred: true|false }
//
// OP exposes /queries/{id}/star and /queries/{id}/unstar — both PATCH with
// no body. We collapse them into one route so the client can toggle.
export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json().catch(() => ({}));
    const path = data?.starred === false ? `/queries/${id}/unstar` : `/queries/${id}/star`;
    const updated = await opFetch(path, { method: "PATCH" });
    return Response.json(mapQuery(updated));
  } catch (e) {
    return errorResponse(e);
  }
}
