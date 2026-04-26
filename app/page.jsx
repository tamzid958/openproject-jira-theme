import { Suspense } from "react";
import App from "@/components/app";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
