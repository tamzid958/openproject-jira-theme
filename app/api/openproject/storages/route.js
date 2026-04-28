import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapStorage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hal = await opFetch(withQuery("/storages", { pageSize: "100" }));
    return Response.json(elementsOf(hal).map(mapStorage));
  } catch (e) {
    return errorResponse(e);
  }
}
