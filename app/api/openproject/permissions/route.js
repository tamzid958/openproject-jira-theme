import { getViewerPermissions } from "@/lib/openproject/permissions";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Effective permissions for the signed-in user, folded across all of their
// memberships. The shape is `{admin: bool, byProject: {[projectId]: string[]}}`.
// Cached per-user in-process for 5 min.
export async function GET() {
  try {
    const data = await getViewerPermissions();
    return Response.json(data);
  } catch (e) {
    return errorResponse(e);
  }
}
