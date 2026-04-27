import { opFetch } from "@/lib/openproject/client";
import { buildCommentBody, elementsOf, mapActivity, mapUser } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// LRU cap so a long-lived process doesn't accumulate every author + miss.
const USER_CACHE_MAX = 500;
const userCache = new Map();

async function resolveUser(userId) {
  if (!userId) return null;
  if (userCache.has(userId)) {
    const v = userCache.get(userId);
    userCache.delete(userId);
    userCache.set(userId, v);
    return v;
  }
  let mapped;
  try {
    mapped = mapUser(await opFetch(`/users/${userId}`));
  } catch {
    mapped = null;
  }
  userCache.set(userId, mapped);
  if (userCache.size > USER_CACHE_MAX) {
    userCache.delete(userCache.keys().next().value);
  }
  return mapped;
}

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const hal = await opFetch(`/work_packages/${nativeId(id)}/activities`);
    const activities = elementsOf(hal).map(mapActivity);
    // Backfill any missing author names. OpenProject usually populates
    // `_links.user.title`, but some activity types (and some instance configs)
    // omit it — leaving the UI to render "Someone". Fetch each unique author
    // once and inject the name.
    const missing = [...new Set(activities.filter((a) => a.author && !a.authorName).map((a) => a.author))];
    if (missing.length > 0) {
      const resolved = await Promise.all(missing.map(resolveUser));
      const byId = new Map();
      missing.forEach((uid, i) => byId.set(uid, resolved[i]));
      for (const a of activities) {
        if (!a.authorName && a.author) {
          const u = byId.get(a.author);
          if (u?.name) a.authorName = u.name;
        }
      }
    }
    return Response.json(activities);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const { text } = await req.json();
    if (!text || !String(text).trim()) {
      return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    const a = await opFetch(`/work_packages/${nativeId(id)}/activities`, {
      method: "POST",
      body: JSON.stringify(buildCommentBody(text)),
    });
    return Response.json(mapActivity(a));
  } catch (e) {
    return errorResponse(e);
  }
}
