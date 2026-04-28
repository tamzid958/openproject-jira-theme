import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapReminder } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/work_packages/${nativeId(id)}/reminders`, {
      pageSize: "100",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapReminder));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/openproject/work-packages/<id>/reminders
// Body: { remindAt (ISO), note? }
//
// "Remind me about this WP" personal reminder. The current user is implied
// from the OAuth bearer; OP attaches the reminder to that user.
export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    if (!data.remindAt) {
      return Response.json({ error: "remindAt is required" }, { status: 400 });
    }
    const body = {
      remindAt: data.remindAt,
      note: data.note || "",
      _links: {
        workPackage: { href: `/api/v3/work_packages/${nativeId(id)}` },
      },
    };
    const r = await opFetch(`/work_packages/${nativeId(id)}/reminders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapReminder(r));
  } catch (e) {
    return errorResponse(e);
  }
}
