"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BotIdClient } from "botid/client";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

// Routes that should get BotID protection. The server-side
// checkBotId() in each route handler reads the same fingerprint
// emitted by BotIdClient below — both lists must stay in sync.
const PROTECTED_PATHS = [
  { path: "/api/storage/upload", method: "POST" as const },
  { path: "/api/log/error", method: "POST" as const },
];

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Mount once near root so the fingerprint token attaches to
            every subsequent POST on the protected paths. No-op when
            the Vercel deployment doesn't have BotID enabled. */}
        <BotIdClient protect={PROTECTED_PATHS} />
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#10b981",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
          showRecentTransactions
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
