import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapWorkingHours } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/users/${id}/working_hours`, { pageSize: "20" });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapWorkingHours));
  } catch (e) {
    return errorResponse(e);
  }
}
