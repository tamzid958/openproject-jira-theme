import { opFetch } from "@/lib/openproject/client";
import { mapProject } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const p = await opFetch(`/projects/${encodeURIComponent(id)}`);
    return Response.json({
      ...mapProject(p),
      description: p.description?.raw || "",
      identifier: p.identifier,
      active: p.active,
      public: p.public,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
