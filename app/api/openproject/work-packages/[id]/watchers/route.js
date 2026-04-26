import { opFetch } from "@/lib/openproject/client";
import { elementsOf, mapWatcher } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const hal = await opFetch(`/work_packages/${nativeId(id)}/watchers`);
    return Response.json(elementsOf(hal).map(mapWatcher).filter(Boolean));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const { userId } = await req.json();
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }
    const u = await opFetch(`/work_packages/${nativeId(id)}/watchers`, {
      method: "POST",
      body: JSON.stringify({ user: { href: `/api/v3/users/${userId}` } }),
    });
    return Response.json(mapWatcher(u));
  } catch (e) {
    return errorResponse(e);
  }
}
