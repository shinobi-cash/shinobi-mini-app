import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

// Initialize Shinobi Indexer SDK
import "@/lib/indexer/client";
import App from "./App.tsx";
import { isFarcasterEnvironment } from "./utils/environment.ts";
import { config } from "./wagmi.ts";

import "./index.css";

/** ---------- Query Client (app-wide) ---------- */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000, // don’t spam reloads
      refetchOnWindowFocus: false, // keep UX calm
      retry: 2,
    },
  },
});

// Component that conditionally wraps with RainbowKit
const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  if (isFarcasterEnvironment()) {
    // Farcaster environment - use simple WagmiProvider
    return <WagmiProvider config={config}>{children}</WagmiProvider>;
  }

  // Browser environment - use RainbowKit + WagmiProvider
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <App />
      </WalletProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
