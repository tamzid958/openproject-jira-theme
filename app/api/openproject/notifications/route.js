import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapNotification } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const onlyUnread = url.searchParams.get("unread") === "1";
    const path = withQuery("/notifications", {
      pageSize: "50",
      filters: onlyUnread
        ? buildFilters([{ readIAN: { operator: "=", values: ["f"] } }])
        : null,
    });
    const hal = await opFetch(path);
    const items = elementsOf(hal).map(mapNotification);
    return Response.json({
      items,
      total: hal.total ?? items.length,
      unread: items.filter((n) => !n.readIAN).length,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH: mark as read. Body: { ids: ["123","124"] }
export async function PATCH(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "ids array required" }, { status: 400 });
    }
    // OpenProject exposes /notifications/read_ian with a filter param.
    const filters = buildFilters([{ id: { operator: "=", values: ids.map(String) } }]);
    await opFetch(`/notifications/read_ian?filters=${encodeURIComponent(filters)}`, {
      method: "POST",
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
