import { opFetch, opPatchWithLock } from "@/lib/openproject/client";
import { mapWikiPage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const w = await opFetch(`/wiki_pages/${id}`);
    return Response.json(mapWikiPage(w));
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH: edit page text. Not surfaced in the read-only first-pass UI but
// the proxy is here so a future editor doesn't need a server change.
export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    const buildBody = (lockVersion) => {
      const body = { lockVersion };
      if (data.title !== undefined) body.title = data.title;
      if (data.text !== undefined) body.text = { raw: data.text };
      return body;
    };
    const updated = await opPatchWithLock(`/wiki_pages/${id}`, buildBody);
    return Response.json(mapWikiPage(updated));
  } catch (e) {
    return errorResponse(e);
  }
}
