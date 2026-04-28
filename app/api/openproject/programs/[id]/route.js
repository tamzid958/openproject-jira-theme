import { opFetch } from "@/lib/openproject/client";
import { mapProgram } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const p = await opFetch(`/programs/${id}`);
    return Response.json(mapProgram(p));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const body = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = { raw: data.description };
    if (Array.isArray(data.projectIds)) {
      body._links = {
        projects: data.projectIds.map((pid) => ({ href: `/api/v3/projects/${pid}` })),
      };
    }
    const p = await opFetch(`/programs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(mapProgram(p));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    await opFetch(`/programs/${id}`, { method: "DELETE" });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
