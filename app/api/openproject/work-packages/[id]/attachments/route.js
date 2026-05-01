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
    const fileName = String(incoming.get("fileName") || file.name || "upload");
    const metadata = {
      fileName,
      description: description ? { raw: String(description) } : undefined,
    };
    // Re-buffer the file. Re-appending a File object across FormData instances
    // sometimes leaves a half-consumed stream by the time undici streams it
    // upstream, which OpenProject answers with 500. A fresh Blob from an
    // ArrayBuffer is always cleanly seekable.
    const fileBuf = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuf], {
      type: file.type || "application/octet-stream",
    });
    const fd = new FormData();
    // Metadata MUST be appended as a plain string, not a Blob. undici sets
    // `filename="blob"` on Blob parts, which makes OpenProject's Rack parser
    // treat the metadata part as a file upload. The controller then receives
    // a Hash (tempfile/filename/type) where it expects a JSON string and
    // throws `no implicit conversion of HashWithIndifferentAccess into String`.
    // A plain string append produces a text form field that OP JSON-parses.
    fd.append("metadata", JSON.stringify(metadata));
    fd.append("file", fileBlob, fileName);
    const a = await opFetchMultipart(`/work_packages/${nativeId(id)}/attachments`, fd);
    return Response.json(mapAttachment(a));
  } catch (e) {
    return errorResponse(e);
  }
}
