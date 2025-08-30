import { isFarcasterEnvironment } from "@/utils/environment";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2 } from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { Button } from "../ui/button";

export const WalletConnectionActions = () => {
  const { connect, connectors, isPending } = useConnect();
  const { isConnecting } = useAccount();

  // In browser environment, use RainbowKit's ConnectButton
  if (!isFarcasterEnvironment()) {
    return (
      <div className="w-full max-w-sm space-y-3">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
            const ready = mounted && authenticationStatus !== "loading";
            const connected =
              ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated");

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button
                        variant="default"
                        className="w-full h-12 text-base font-medium rounded-2xl"
                        onClick={openConnectModal}
                        size="lg"
                      >
                        Connect Wallet
                      </Button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button
                        variant="destructive"
                        className="w-full h-12 text-base font-medium rounded-2xl"
                        onClick={openChainModal}
                        size="lg"
                      >
                        Wrong network
                      </Button>
                    );
                  }

                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 text-base font-medium rounded-2xl"
                        onClick={openChainModal}
                        size="lg"
                      >
                        {chain.hasIcon && (
                          <div className="w-4 h-4 mr-2">
                            {chain.iconUrl && (
                              <img alt={chain.name ?? "Chain icon"} src={chain.iconUrl} className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1 h-12 text-base font-medium rounded-2xl"
                        onClick={openAccountModal}
                        size="lg"
                      >
                        {account.displayName}
                        {account.displayBalance ? ` (${account.displayBalance})` : ""}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>

        <p className="text-xs text-center text-app-secondary">Connect your wallet to proceed with deposits</p>
      </div>
    );
  }

  // In Farcaster environment, use simple connector approach
  const handleConnect = () => {
    const farcasterConnector = connectors[0];
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  const isLoading = isPending || isConnecting;

  return (
    <div className="w-full max-w-sm space-y-3">
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium rounded-2xl"
        onClick={handleConnect}
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>

      {connectors.length > 0 && (
        <p className="text-xs text-center text-app-secondary">Connect your wallet to proceed with deposits</p>
      )}
    </div>
  );
};
