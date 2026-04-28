import { opFetch } from "@/lib/openproject/client";
import { mapPost } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const p = await opFetch(`/posts/${id}`);
    return Response.json(mapPost(p));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.body !== undefined) body.content = { raw: data.body };
    const p = await opFetch(`/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapPost(p));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/posts/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
