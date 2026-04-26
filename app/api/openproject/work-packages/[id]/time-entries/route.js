import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { buildTimeEntryBody, elementsOf, mapTimeEntry } from "@/lib/openproject/mappers";
import { toIsoDuration } from "@/lib/openproject/duration";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery("/time_entries", {
      pageSize: "100",
      filters: buildFilters([{ workPackage: { operator: "=", values: [nativeId(id)] } }]),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapTimeEntry));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    if (data.hours == null) {
      return Response.json({ error: "hours is required" }, { status: 400 });
    }
    const hoursIso = toIsoDuration(Number(data.hours));
    if (!hoursIso) {
      return Response.json({ error: "hours must be a positive number" }, { status: 400 });
    }
    const body = buildTimeEntryBody({
      workPackageId: nativeId(id),
      hoursIso,
      spentOn: data.spentOn,
      comment: data.comment,
      activityId: data.activityId,
    });
    const t = await opFetch("/time_entries", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapTimeEntry(t));
  } catch (e) {
    return errorResponse(e);
  }
}
