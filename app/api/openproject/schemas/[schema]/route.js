import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

const TTL_MS = 10 * 60 * 1000;
const CACHE = new Map();

// Some OP installs (notably the ones we hit) don't populate
// `_links.allowedValues` on a CustomOption schema, so the picker can't
// fetch its option list. As a fallback, sample WPs in the schema's project
// that already have the field set and collect distinct option hrefs.
async function discoverOptionsFromWorkPackages(schemaId, fieldKey) {
  const projectId = String(schemaId).match(/^(\d+)-/)?.[1];
  if (!projectId) return null;
  try {
    const filters = JSON.stringify([{ [fieldKey]: { operator: "*", values: [] } }]);
    const hal = await opFetch(
      `/projects/${projectId}/work_packages?pageSize=200&filters=${encodeURIComponent(filters)}`,
    );
    const seen = new Map();
    for (const wp of hal?._embedded?.elements || []) {
      const link = wp._links?.[fieldKey];
      if (link?.href && link?.title && !seen.has(link.href)) {
        seen.set(link.href, { id: link.href.split("/").pop(), value: link.title, href: link.href });
      }
    }
    return seen.size > 0 ? [...seen.values()] : null;
  } catch {
    return null;
  }
}

// Returns the WP schema's custom-field metadata in a UI-friendly shape.
// Strips the verbose HAL crud and exposes allowedValues hrefs so callers can
// resolve labels (S/M/L/XL) to option IDs without re-traversing HAL.
export async function GET(_req, ctx) {
  try {
    const { schema } = await ctx.params;
    const cached = CACHE.get(schema);
    if (cached && Date.now() - cached.t < TTL_MS) {
      return Response.json(cached.value);
    }
    const s = await opFetch(`/work_packages/schemas/${schema}`);
    const fields = {};
    const customFieldKeys = Object.keys(s).filter((k) => k.startsWith("customField"));
    for (const k of customFieldKeys) {
      const f = s[k];
      fields[k] = {
        name: f.name,
        type: f.type,
        required: !!f.required,
        allowedValuesHref: f._links?.allowedValues?.href || null,
        allowedValues: null,
      };
    }
    // For every CustomOption custom field that has neither an embedded list
    // nor an allowedValues link, sample WPs to discover the option set.
    await Promise.all(
      customFieldKeys.map(async (k) => {
        const f = s[k];
        if (f.type !== "CustomOption") return;
        const embedded = f._embedded?.allowedValues;
        if (Array.isArray(embedded) && embedded.length > 0) {
          fields[k].allowedValues = embedded.map((o) => ({
            id: String(o.id),
            value: o.value,
            href: o._links?.self?.href,
          }));
          return;
        }
        if (fields[k].allowedValuesHref) return;
        const discovered = await discoverOptionsFromWorkPackages(schema, k);
        if (discovered) fields[k].allowedValues = discovered;
      }),
    );
    const value = { schema, fields };
    CACHE.set(schema, { t: Date.now(), value });
    return Response.json(value);
  } catch (e) {
    return errorResponse(e);
  }
}
