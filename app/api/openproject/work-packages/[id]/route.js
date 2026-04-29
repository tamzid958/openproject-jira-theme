import { opFetch, opPatchWithLock } from "@/lib/openproject/client";
import { buildPatchBody, mapWorkPackage } from "@/lib/openproject/mappers";
import { htmlToMarkdown } from "@/lib/openproject/description";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";
import { resolveOptionForLabel, FIELD as SP_FIELD } from "@/lib/openproject/story-points";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const wp = await opFetch(`/work_packages/${nativeId(id)}`);
    return Response.json(mapWorkPackage(wp));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    const patch = await req.json();
    const nid = nativeId(id);

    // The Tiptap editor emits HTML; OpenProject stores descriptions as
    // markdown. Convert before sending so OP doesn't render literal tags.
    if (patch.description != null) {
      patch.description = htmlToMarkdown(patch.description);
    }

    // Resolve story-points editing — for CustomOption fields we need the
    // matching custom_options href, derived via the WP schema.
    if (patch.points !== undefined && SP_FIELD !== "storyPoints" && SP_FIELD.startsWith("customField")) {
      const cur = await opFetch(`/work_packages/${nid}`);
      const schemaPath = (cur._links?.schema?.href || "").replace(/^\/api\/v3/, "");
      let pointsHref = null;
      if (patch.points != null && schemaPath) {
        const opt = await resolveOptionForLabel(schemaPath, SP_FIELD, patch.points);
        if (opt?.href) pointsHref = opt.href;
      }
      patch.pointsHref = pointsHref;
    } else if (patch.points !== undefined) {
      // Native numeric field — pass through as-is.
      patch.pointsField = SP_FIELD;
    }

    const wp = await opPatchWithLock(`/work_packages/${nid}`, (lockVersion) =>
      buildPatchBody(patch, { lockVersion }),
    );
    return Response.json(mapWorkPackage(wp));
  } catch (e) {
    return errorResponse(e);
  }
}
