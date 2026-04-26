import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapPriority } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hal = await opFetch(withQuery("/priorities", { pageSize: "100" }));
    return Response.json(elementsOf(hal).map(mapPriority));
  } catch (e) {
    return errorResponse(e);
  }
}
