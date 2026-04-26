import { opFetchRaw } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const upstream = await opFetchRaw(`/attachments/${id}/content`);
    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    const cd = upstream.headers.get("content-disposition");
    const cl = upstream.headers.get("content-length");
    if (ct) headers.set("content-type", ct);
    if (cd) headers.set("content-disposition", cd);
    if (cl) headers.set("content-length", cl);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return errorResponse(e);
  }
}
