import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const r = await opFetch(`/file_links/${id}/download`);
    const href =
      (r && typeof r === "object" && (r._links?.self?.href || r.href || r.url)) ||
      (typeof r === "string" ? r : null);
    if (!href) {
      return Response.json({ error: "no download URL returned" }, { status: 502 });
    }
    return Response.redirect(href, 307);
  } catch (e) {
    return errorResponse(e);
  }
}
