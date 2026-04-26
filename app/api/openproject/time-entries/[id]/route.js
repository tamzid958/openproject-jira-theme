import { opFetch, opPatchWithLock } from "@/lib/openproject/client";
import { mapTimeEntry } from "@/lib/openproject/mappers";
import { toIsoDuration } from "@/lib/openproject/duration";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const buildBody = (lockVersion) => {
      const body = { lockVersion };
      if (data.hours != null) {
        const hoursIso = toIsoDuration(Number(data.hours));
        if (!hoursIso) throw Object.assign(new Error("hours must be a positive number"), { status: 400 });
        body.hours = hoursIso;
      }
      if (data.spentOn) body.spentOn = data.spentOn;
      if (data.comment !== undefined) body.comment = { raw: data.comment || "" };
      return body;
    };
    const t = await opPatchWithLock(`/time_entries/${id}`, buildBody);
    return Response.json(mapTimeEntry(t));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/time_entries/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
