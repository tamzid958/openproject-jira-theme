import { opFetch } from "@/lib/openproject/client";
import { buildVersionCreateBody, mapVersionFull } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (!data.projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }
    const body = buildVersionCreateBody(data);
    const v = await opFetch("/versions", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapVersionFull(v));
  } catch (e) {
    return errorResponse(e);
  }
}
