import { opFetch } from "@/lib/openproject/client";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function DELETE(_req, ctx) {
  try {
    const { id, userId } = await ctx.params;
    await opFetch(`/work_packages/${nativeId(id)}/watchers/${userId}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
