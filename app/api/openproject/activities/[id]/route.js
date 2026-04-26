import { opFetch } from "@/lib/openproject/client";
import { mapActivity } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Edits an existing comment (Activity::Comment). The OpenProject v3 API
// expects a bare-string `comment` field on PATCH (NOT the wrapped
// `{comment: {raw: …}}` shape used on POST). The response, however, comes
// back with the rich shape. Verified live against /api/v3/activities/:id.
export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    const a = await opFetch(`/activities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ comment: text }),
    });
    return Response.json(mapActivity(a));
  } catch (e) {
    return errorResponse(e);
  }
}
