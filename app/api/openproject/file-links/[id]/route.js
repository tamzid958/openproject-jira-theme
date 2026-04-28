import { opFetch } from "@/lib/openproject/client";
import { mapFileLink } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const f = await opFetch(`/file_links/${id}`);
    return Response.json(mapFileLink(f));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/file_links/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
