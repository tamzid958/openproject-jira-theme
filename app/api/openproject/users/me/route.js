import { opFetch } from "@/lib/openproject/client";
import { mapUser } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await opFetch("/users/me");
    return Response.json(mapUser(me));
  } catch (e) {
    return errorResponse(e);
  }
}
