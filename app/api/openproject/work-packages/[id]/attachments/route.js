import { opFetch, opFetchMultipart } from "@/lib/openproject/client";
import { elementsOf, mapAttachment } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const hal = await opFetch(`/work_packages/${nativeId(id)}/attachments`);
    return Response.json(elementsOf(hal).map(mapAttachment));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const incoming = await req.formData();
    const file = incoming.get("file");
    const description = incoming.get("description") || "";
    if (!file || typeof file === "string") {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }
    const fileName = incoming.get("fileName") || file.name || "upload";
    const metadata = {
      fileName,
      description: description ? { raw: String(description) } : undefined,
    };
    const fd = new FormData();
    fd.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    fd.append("file", file, fileName);
    const a = await opFetchMultipart(`/work_packages/${nativeId(id)}/attachments`, fd);
    return Response.json(mapAttachment(a));
  } catch (e) {
    return errorResponse(e);
  }
}
