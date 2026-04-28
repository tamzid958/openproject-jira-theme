import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/file-links/<id>/open
//
// OP returns the storage-side URL for previewing the file (typically a 303
// to the Nextcloud/OneDrive web UI). We fetch it server-side to extract the
// final URL, then 307 the browser there. The user's storage-side session
// handles auth — we never touch the file content.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const r = await opFetch(`/file_links/${id}/open`);
    // OP's open endpoint usually returns a HAL doc with `_links.self.href`
    // pointing at the storage URL. Some installs return the URL directly as
    // a string. Handle both.
    const href =
      (r && typeof r === "object" && (r._links?.self?.href || r.href || r.url)) ||
      (typeof r === "string" ? r : null);
    if (!href) {
      return Response.json({ error: "no open URL returned" }, { status: 502 });
    }
    return Response.redirect(href, 307);
  } catch (e) {
    return errorResponse(e);
  }
}
