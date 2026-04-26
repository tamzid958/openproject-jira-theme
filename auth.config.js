// Edge-compatible NextAuth config used by middleware. Providers are added in
// `auth.js` (Node-only) since they need network access during sign-in.

const authConfig = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isPublic =
        path === "/sign-in" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/_next") ||
        path === "/favicon.ico";
      if (isPublic) return true;
      return Boolean(auth?.user);
    },
  },
};

export default authConfig;
