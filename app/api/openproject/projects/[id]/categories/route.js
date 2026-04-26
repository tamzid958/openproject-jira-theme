import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapCategory } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/projects/${encodeURIComponent(id)}/categories`, {
      pageSize: "200",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapCategory));
  } catch (e) {
    return errorResponse(e);
  }
}

