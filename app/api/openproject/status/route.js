import { BASE, isConfigured } from "@/lib/openproject/client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isConfigured();
  let user = null;
  try {
    const session = await auth();
    if (session?.user) user = session.user;
  } catch {
    /* ignore */
  }
  // Expose the public OP base URL so the Tags page (and any other
  // surface that wants to deep-link) can build URLs like
  // `<baseUrl>/projects/<id>/settings/categories`.
  return Response.json({
    configured,
    signedIn: Boolean(user),
    user,
    baseUrl: configured ? BASE : null,
  });
}
