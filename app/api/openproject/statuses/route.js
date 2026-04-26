import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapStatus } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hal = await opFetch(withQuery("/statuses", { pageSize: "100" }));
    return Response.json(elementsOf(hal).map(mapStatus));
  } catch (e) {
    return errorResponse(e);
  }
}
