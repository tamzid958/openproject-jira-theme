import { opFetch } from "@/lib/openproject/client";
import { elementsOf } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Resolves an allowedValues collection from a schema field. Caller passes the
// HAL href via ?href=/api/v3/...
export async function GET(req) {
  try {
    const href = new URL(req.url).searchParams.get("href");
    if (!href) {
      return Response.json({ error: "href is required" }, { status: 400 });
    }
    const path = href.replace(/^\/api\/v3/, "");
    const hal = await opFetch(path);
    const els = elementsOf(hal);
    return Response.json(
      els.map((o) => ({ id: String(o.id), value: o.value, href: o._links?.self?.href })),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
