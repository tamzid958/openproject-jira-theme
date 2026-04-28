import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { buildTimeEntryBody, elementsOf, mapTimeEntry } from "@/lib/openproject/mappers";
import { toIsoDuration } from "@/lib/openproject/duration";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/time-entries
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=&userId=&workPackageId=
//
// All filters are optional; with no filters this returns the viewer's most
// recent entries (OP defaults to the current user when no `user` filter is
// supplied via the JS frontend session, which we don't have — so callers
// should always pass `userId` when they mean "mine").
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const projectId = url.searchParams.get("projectId");
    const userId = url.searchParams.get("userId");
    const workPackageId = url.searchParams.get("workPackageId");

    const filters = [];
    if (from && to) {
      filters.push({ spentOn: { operator: "<>d", values: [from, to] } });
    } else if (from) {
      filters.push({ spentOn: { operator: ">=d", values: [from] } });
    } else if (to) {
      filters.push({ spentOn: { operator: "<=d", values: [to] } });
    }
    if (projectId) filters.push({ project: { operator: "=", values: [String(projectId)] } });
    if (userId) filters.push({ user: { operator: "=", values: [String(userId)] } });
    if (workPackageId)
      filters.push({ workPackage: { operator: "=", values: [String(workPackageId)] } });

    const path = withQuery("/time_entries", {
      pageSize: "500",
      sortBy: JSON.stringify([["spentOn", "desc"]]),
      filters: buildFilters(filters),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapTimeEntry));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/openproject/time-entries
// Body: { workPackageId, hours, spentOn?, comment?, activityId? }
//
// Top-level POST (not WP-scoped) so the global "Log time" modal can pick the
// WP from a search field rather than being launched from a task detail.
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.workPackageId) {
      return Response.json({ error: "workPackageId is required" }, { status: 400 });
    }
    if (data.hours == null) {
      return Response.json({ error: "hours is required" }, { status: 400 });
    }
    const hoursIso = toIsoDuration(Number(data.hours));
    if (!hoursIso) {
      return Response.json({ error: "hours must be a positive number" }, { status: 400 });
    }
    const body = buildTimeEntryBody({
      workPackageId: data.workPackageId,
      hoursIso,
      spentOn: data.spentOn,
      comment: data.comment,
      activityId: data.activityId,
    });
    const t = await opFetch("/time_entries", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapTimeEntry(t));
  } catch (e) {
    return errorResponse(e);
  }
}
