import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapProgram } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hal = await opFetch(withQuery("/programs", { pageSize: "100" }));
    return Response.json(elementsOf(hal).map(mapProgram));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name) return Response.json({ error: "name required" }, { status: 400 });
    const body = {
      name: data.name,
      description: data.description ? { raw: data.description } : undefined,
      _links: {},
    };
    if (Array.isArray(data.projectIds)) {
      body._links.projects = data.projectIds.map((id) => ({
        href: `/api/v3/projects/${id}`,
      }));
    }
    const p = await opFetch("/programs", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapProgram(p));
  } catch (e) {
    return errorResponse(e);
  }
}
