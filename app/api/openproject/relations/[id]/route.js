import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// DELETE — remove a relation by its global id. The deleting user needs the
// "manage work package relations" permission on the project the relation
// belongs to; OP returns 403 otherwise and we surface that as-is.
export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/relations/${encodeURIComponent(id)}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
