import { opFetch } from "@/lib/openproject/client";
import { mapWorkingHours } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id, hoursId } = await ctx.params;
    const r = await opFetch(`/users/${id}/working_hours/${hoursId}`);
    return Response.json(mapWorkingHours(r));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id, hoursId } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.start !== undefined) body.start = data.start;
    if (data.end !== undefined) body.end = data.end;
    if (data.hours !== undefined) body.hours = data.hours;
    if (data.weekday !== undefined) body.weekday = data.weekday;
    const r = await opFetch(`/users/${id}/working_hours/${hoursId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapWorkingHours(r));
  } catch (e) {
    return errorResponse(e);
  }
}
