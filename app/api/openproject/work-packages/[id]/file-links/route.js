import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapFileLink } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/work-packages/<id>/file-links
//
// Lists external file links attached to a work package — files stored in
// linked storages (Nextcloud, OneDrive, etc.) rather than uploaded as native
// attachments.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/work_packages/${nativeId(id)}/file_links`, {
      pageSize: "100",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapFileLink));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST: attach a file link to a WP. Body shape pass-through to OP.
// Expects: { storageId, originId, originName, originMimeType? }
export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    if (!data.storageId || !data.originId || !data.originName) {
      return Response.json(
        { error: "storageId, originId, originName required" },
        { status: 400 },
      );
    }
    const body = {
      _embedded: {
        elements: [
          {
            originData: {
              id: String(data.originId),
              name: data.originName,
              mimeType: data.originMimeType || null,
            },
            _links: {
              storage: { href: `/api/v3/storages/${data.storageId}` },
            },
          },
        ],
      },
    };
    const hal = await opFetch(`/work_packages/${nativeId(id)}/file_links`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const els = hal?._embedded?.elements || [];
    return Response.json(els.map(mapFileLink));
  } catch (e) {
    return errorResponse(e);
  }
}
