import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapUser } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const pageSize = url.searchParams.get("pageSize") || "100";
    const hal = await opFetch(withQuery("/users", { pageSize }));
    return Response.json(elementsOf(hal).map(mapUser).filter(Boolean));
  } catch (e) {
    return errorResponse(e);
  }
}
