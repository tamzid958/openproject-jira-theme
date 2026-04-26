import { Suspense } from "react";
import { SignInCard } from "./sign-in-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — OpenProject",
};

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 30% 10%, var(--accent-50), transparent 40%), var(--bg-app)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Suspense fallback={null}>
        <SignInCard />
      </Suspense>
    </div>
  );
}
