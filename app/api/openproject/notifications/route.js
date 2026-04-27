import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapNotification } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Per the v3 spec, /notifications supports filtering by `readIAN` and by
// `reason` (the enum from NotificationModel: assigned, mentioned, watched,
// dateAlert, …). We expose both so the bell can scope the list to the
// reasons the user actually cares about.
const ALLOWED_REASONS = new Set([
  "assigned",
  "commented",
  "created",
  "dateAlert",
  "mentioned",
  "prioritized",
  "processed",
  "responsible",
  "subscribed",
  "scheduled",
  "watched",
]);

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const onlyUnread = url.searchParams.get("unread") === "1";
    const reasonsRaw = url.searchParams.get("reasons") || "";
    const reasons = reasonsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALLOWED_REASONS.has(s));
    const filterList = [];
    if (onlyUnread) {
      filterList.push({ readIAN: { operator: "=", values: ["f"] } });
    }
    if (reasons.length > 0) {
      filterList.push({ reason: { operator: "=", values: reasons } });
    }
    const path = withQuery("/notifications", {
      pageSize: "50",
      filters: filterList.length > 0 ? buildFilters(filterList) : null,
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

// PATCH: mark notifications as read.
//
// Body shapes:
//   { all: true }                — mark every unread notification (server-
//                                   wide for the current user) as read.
//                                   Uses POST /notifications/read_ian with
//                                   no filter, which the OP v3 spec defines
//                                   as "Marks the whole notification
//                                   collection as read".
//   { ids: ["123", "124"] }      — mark only those notifications.
//
// We always POST to /notifications/read_ian — that's the v3-spec endpoint
// for both shapes. The id-scoped filter is just an additional constraint
// on the same call.
export async function PATCH(req) {
  try {
    const data = await req.json().catch(() => ({}));
    let url = "/notifications/read_ian";
    if (Array.isArray(data?.ids) && data.ids.length > 0) {
      const filters = buildFilters([
        { id: { operator: "=", values: data.ids.map(String) } },
      ]);
      url = `${url}?filters=${encodeURIComponent(filters)}`;
    } else if (!data?.all) {
      // Neither ids nor `all` — refuse, otherwise an empty body would
      // silently mark everything read against the user's intent.
      return Response.json(
        { error: "Pass { all: true } to mark all read, or { ids: [...] } for specific notifications" },
        { status: 400 },
      );
    }
    await opFetch(url, { method: "POST" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
