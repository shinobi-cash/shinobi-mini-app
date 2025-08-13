import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, baseSepolia, mainnet } from "wagmi/chains";

export const config = createConfig({
  chains: [baseSepolia, base, mainnet],
  connectors: [farcasterFrame()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}