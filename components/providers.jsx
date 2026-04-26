"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import { RealtimeSync } from "@/components/realtime-sync";
import { OfflineQueueRunner } from "@/components/offline-queue-runner";

export function Providers({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SessionProvider>
          <QueryClientProvider client={client}>
            {children}
            <RealtimeSync />
            <OfflineQueueRunner />
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
