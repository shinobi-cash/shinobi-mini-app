import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import App from "./App.tsx";
import { config } from "./wagmi.ts";
import { apolloClient } from "./lib/clients.ts";
import { isFarcasterEnvironment } from "./utils/environment.ts";

import "./index.css";

const queryClient = new QueryClient();

// Component that conditionally wraps with RainbowKit
const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  if (isFarcasterEnvironment()) {
    // Farcaster environment - use simple WagmiProvider
    return (
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    );
  }
  
  // Browser environment - use RainbowKit + WagmiProvider
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <ApolloProvider client={apolloClient}>
          <App />
        </ApolloProvider>
      </WalletProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);