import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapNonWorkingTime } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/users/${id}/non_working_times`, { pageSize: "200" });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapNonWorkingTime));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    if (!data.start) return Response.json({ error: "start is required" }, { status: 400 });
    const body = {
      name: data.name || "Time off",
      start: data.start,
      end: data.end || data.start,
      allDay: data.allDay !== false,
    };
    const r = await opFetch(`/users/${id}/non_working_times`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapNonWorkingTime(r));
  } catch (e) {
    return errorResponse(e);
  }
}
