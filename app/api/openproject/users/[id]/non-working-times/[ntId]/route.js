import { opFetch } from "@/lib/openproject/client";
import { mapNonWorkingTime } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id, ntId } = await ctx.params;
    const r = await opFetch(`/users/${id}/non_working_times/${ntId}`);
    return Response.json(mapNonWorkingTime(r));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id, ntId } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.start !== undefined) body.start = data.start;
    if (data.end !== undefined) body.end = data.end;
    if (data.allDay !== undefined) body.allDay = data.allDay;
    const r = await opFetch(`/users/${id}/non_working_times/${ntId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapNonWorkingTime(r));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id, ntId } = await ctx.params;
    await opFetch(`/users/${id}/non_working_times/${ntId}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
