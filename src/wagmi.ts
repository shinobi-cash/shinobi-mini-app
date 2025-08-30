import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { isFarcasterEnvironment } from "./utils/environment";

// For browser usage - Rainbow wallet configuration
const rainbowConfig = getDefaultConfig({
  appName: "shinobi.cash",
  projectId: import.meta.env.VITE_WC_PROJECT_ID || "",
  chains: [baseSepolia],
  ssr: false,
});

// For Farcaster mini app - simple config with only Farcaster connector
const farcasterConfig = createConfig({
  chains: [baseSepolia],
  connectors: [farcasterMiniApp()],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// Export the appropriate config based on environment
export const config = isFarcasterEnvironment() ? farcasterConfig : rainbowConfig;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
