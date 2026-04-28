import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import {
  buildMembershipCreateBody,
  elementsOf,
  mapMembership,
} from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/memberships?projectId=&principalId=
//
// Top-level list — global memberships. Mirrors the per-project route at
// `projects/[id]/memberships` but supports cross-project queries (e.g. "all
// memberships for user X") needed by the global members admin.
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const principalId = url.searchParams.get("principalId");
    const filters = [];
    if (projectId) filters.push({ project: { operator: "=", values: [String(projectId)] } });
    if (principalId)
      filters.push({ principal: { operator: "=", values: [String(principalId)] } });
    const path = withQuery("/memberships", {
      pageSize: "200",
      filters: buildFilters(filters),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapMembership));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/openproject/memberships
// Body: { projectId, principalId, roleIds: [], sendNotification?, message? }
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.projectId || !data.principalId || !Array.isArray(data.roleIds) || data.roleIds.length === 0) {
      return Response.json(
        { error: "projectId, principalId, roleIds[] required" },
        { status: 400 },
      );
    }
    const body = buildMembershipCreateBody({
      projectId: data.projectId,
      principalId: data.principalId,
      roleIds: data.roleIds,
      sendNotification: data.sendNotification,
      message: data.message,
    });
    const m = await opFetch("/memberships", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapMembership(m));
  } catch (e) {
    return errorResponse(e);
  }
}
