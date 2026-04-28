import { opFetch } from "@/lib/openproject/client";
import { mapRevision } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const r = await opFetch(`/revisions/${id}`);
    return Response.json(mapRevision(r));
  } catch (e) {
    return errorResponse(e);
  }
}
