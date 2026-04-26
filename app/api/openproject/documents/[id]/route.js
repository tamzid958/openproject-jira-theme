import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { mapDocument } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// Single document — used to populate the reader pane with the full
// HTML body (the list endpoint truncates description on some OP
// servers, so we always re-fetch when a doc is opened).
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const d = await opFetch(`/documents/${encodeURIComponent(id)}`);
    return Response.json(mapDocument(d));
  } catch (e) {
    return errorResponse(e);
  }
}
