import { buildFilters, opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// POST /api/openproject/notifications/<id>/unread
//
// Marks one notification as unread. OP v3 exposes `/notifications/unread_ian`
// which accepts a filter — we always pass an id filter so toggling on a row
// only affects that row.
export async function POST(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const filters = buildFilters([
      { id: { operator: "=", values: [String(id)] } },
    ]);
    await opFetch(`/notifications/unread_ian?filters=${encodeURIComponent(filters)}`, {
      method: "POST",
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
