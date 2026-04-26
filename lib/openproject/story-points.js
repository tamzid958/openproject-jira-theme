// Story-point handling.
//
// On many OpenProject instances the team uses a CustomOption field (typically
// "customField7" / "Size") with t-shirt values (S, M, L, XL). Other instances
// use the native numeric `storyPoints` field. The env var
// OPENPROJECT_STORY_POINTS_FIELD chooses which one we read & write.

import { opFetch } from "./client";
export { T_SHIRT_TO_POINTS, T_SHIRT_ORDER } from "./story-points-constants";

export const FIELD = process.env.OPENPROJECT_STORY_POINTS_FIELD || "storyPoints";

// Tiny in-process cache for schema lookups. Schemas don't change often;
// 10-minute TTL is plenty for typical sessions.
const SCHEMA_CACHE = new Map();
const TTL_MS = 10 * 60 * 1000;

function fromCache(key) {
  const hit = SCHEMA_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > TTL_MS) {
    SCHEMA_CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function intoCache(key, value) {
  SCHEMA_CACHE.set(key, { t: Date.now(), value });
}

// Some OpenProject installs don't expose `_links.allowedValues` on the
// schema for a CustomOption field — but every WP that *has* the field set
// carries the option href in `_links[fieldKey]`. As a last-resort fallback
// we sample WPs in the schema's project that have the field set and
// collect the distinct {href, title} pairs.
async function discoverOptionsFromWorkPackages(schemaPath, fieldKey) {
  const projectId = schemaPath.match(/\/schemas\/(\d+)-/)?.[1];
  if (!projectId) return null;
  try {
    const filters = JSON.stringify([{ [fieldKey]: { operator: "*", values: [] } }]);
    const hal = await opFetch(
      `/projects/${projectId}/work_packages?pageSize=200&filters=${encodeURIComponent(filters)}`,
    );
    const seen = new Map(); // href -> {value, href}
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

// Returns the array of allowedValues `[{id, value, href}]` for a CustomOption
// field, or null if the field isn't a CustomOption / has no allowed values.
export async function loadAllowedOptions(schemaPath, fieldKey) {
  const cacheKey = `${schemaPath}::${fieldKey}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const schema = await opFetch(schemaPath);
  const field = schema?.[fieldKey];
  if (!field) {
    intoCache(cacheKey, null);
    return null;
  }
  // The schema either embeds allowedValues directly or links to a collection.
  let options = null;
  const embedded = field._embedded?.allowedValues;
  if (Array.isArray(embedded)) {
    options = embedded.map((o) => ({ id: o.id, value: o.value, href: o._links?.self?.href }));
  } else {
    const href = field._links?.allowedValues?.href;
    if (href) {
      const collection = await opFetch(href.replace(/^\/api\/v3/, ""));
      const els = collection?._embedded?.elements || [];
      options = els.map((o) => ({ id: o.id, value: o.value, href: o._links?.self?.href }));
    }
  }
  // Fallback: discover options by sampling WPs in this project.
  if (!options || options.length === 0) {
    options = await discoverOptionsFromWorkPackages(schemaPath, fieldKey);
  }
  intoCache(cacheKey, options);
  return options;
}

// Resolve a t-shirt label (or numeric string) to the matching custom-option
// `{id, href}` for a given schema. Returns null if no match.
//
// Accepts either a t-shirt label ("S"/"M"/"L"/...) or a Fibonacci number
// (1/2/3/5/8/13). When given a number that maps to a t-shirt size via
// T_SHIRT_TO_POINTS, falls back to the matching size — so a numeric input
// from the legacy <InlineSelect> still finds the right option on a
// t-shirt-style custom field.
export async function resolveOptionForLabel(schemaPath, fieldKey, label) {
  if (label == null) return null;
  const opts = await loadAllowedOptions(schemaPath, fieldKey);
  if (!opts) return null;
  const target = String(label).toUpperCase().trim();
  // Direct match (case-insensitive value equality).
  const direct =
    opts.find((o) => String(o.value).toUpperCase() === target) ||
    opts.find((o) => String(o.value) === String(label));
  if (direct) return direct;
  // Numeric → t-shirt fallback (e.g. 5 → "L").
  const asNumber = Number(label);
  if (!Number.isNaN(asNumber)) {
    const { T_SHIRT_TO_POINTS } = await import("./story-points-constants.js");
    const tshirt = Object.entries(T_SHIRT_TO_POINTS).find(([, n]) => n === asNumber)?.[0];
    if (tshirt) {
      return (
        opts.find((o) => String(o.value).toUpperCase() === tshirt) || null
      );
    }
  }
  return null;
}
