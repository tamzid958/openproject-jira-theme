import { opFetch } from "@/lib/openproject/client";
import { mapReminder } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const r = await opFetch(`/reminders/${id}`);
    return Response.json(mapReminder(r));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.remindAt !== undefined) body.remindAt = data.remindAt;
    if (data.note !== undefined) body.note = data.note;
    const r = await opFetch(`/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapReminder(r));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/reminders/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
