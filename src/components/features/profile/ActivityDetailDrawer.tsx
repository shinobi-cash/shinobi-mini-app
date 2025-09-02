import { NETWORK } from "@/config/constants";
import { useBanner } from "@/contexts/BannerContext";
import type { Activity } from "@/lib/indexer/sdk";
import { formatEthAmount, formatHash, formatTimestamp } from "@/utils/formatters";
import { Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";

interface ActivityDetailDrawerProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActivityDetailDrawer = ({ activity, open, onOpenChange }: ActivityDetailDrawerProps) => {
  const [, setCopiedField] = useState<string | null>(null);
  const { banner } = useBanner();

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      banner.success(`${fieldName} copied!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      banner.error("Failed to copy");
    }
  };

  // formatHash is now imported from utils/formatters

  if (!activity) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        {/* iOS-style drag handle */}
        {/* <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" /> */}

        <DrawerHeader className="pb-0 px-4 py-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary capitalize tracking-tight">
              {activity.type.toLowerCase()} Details
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm items-start text-app-secondary" />
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* Amount Section - iOS card style */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            {activity.type === "DEPOSIT" && activity.originalAmount && activity.vettingFeeAmount ? (
              <div className="space-y-2">
                <div className="px-0 py-1 border-b border-app bg-app-surface">
                  <h3 className="text-sm font-semibold text-app-primary">Deposit Breakdown</h3>
                </div>

                {/* Original Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-app-secondary">Original Amount:</span>
                  <span className="text-sm font-semibold text-app-primary tabular-nums">
                    {formatEthAmount(activity.originalAmount)} ETH
                  </span>
                </div>

                {/* Vetting Fee */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-app-secondary">Vetting Fee:</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">
                    -{formatEthAmount(activity.vettingFeeAmount)} ETH
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-app-border my-1" />

                {/* Final Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-app-secondary">Final Amount:</span>
                  <span className="text-lg font-bold text-app-primary tabular-nums">
                    {formatEthAmount(activity.amount)} ETH
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-app-secondary mb-1">Amount</p>
                <p className="text-2xl font-bold text-app-primary tabular-nums">
                  {`${formatEthAmount(activity.amount)} ETH`}
                </p>
                {activity.type === "DEPOSIT" && <p className="text-xs text-app-tertiary mt-0.5">After vetting fees</p>}
              </div>
            )}
          </div>

          {/* Details Grid - iOS grouped list style */}
          <div className="space-y-3">
            {/* Transaction Details */}
            <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-app bg-app-surface">
                <h3 className="text-sm font-semibold text-app-primary">Transaction</h3>
              </div>

              <div className="divide-y divide-app-border">
                {/* Transaction Hash */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Hash</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-app-primary">{formatHash(activity.transactionHash)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activity.transactionHash, "Transaction Hash")}
                      className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                    >
                      <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                    </button>
                    <a
                      href={`${NETWORK.EXPLORER_URL}/tx/${activity.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-app-tertiary" />
                    </a>
                  </div>
                </div>

                {/* Block Number */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Block</span>
                  <span className="text-xs font-mono text-app-primary">#{activity.blockNumber}</span>
                </div>

                {/* Timestamp */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Time</span>
                  <span className="text-xs text-app-primary">{formatTimestamp(activity.timestamp)}</span>
                </div>

                {/* ASP Status - only for deposits */}
                {activity.type === "DEPOSIT" && (
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-app-secondary">ASP Status</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          activity.aspStatus === "approved"
                            ? "bg-green-500"
                            : activity.aspStatus === "pending"
                              ? "bg-yellow-500"
                              : activity.aspStatus === "rejected"
                                ? "bg-red-500"
                                : "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs text-app-primary capitalize">{activity.aspStatus}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activity.type === "WITHDRAWAL" && (
              <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
                <div className="px-3 py-2 border-b border-app">
                  <h3 className="text-sm font-semibold text-app-primary">Withdrawal Details</h3>
                </div>

                <div className="divide-y divide-app-border">
                  {/* Recipient */}
                  {activity.recipient && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-app-secondary">Recipient</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-app-primary">{formatHash(activity.recipient)}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activity.recipient || "", "Recipient")}
                          className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                        >
                          <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sponsorship Status */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-app-secondary">Gas Sponsored</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${activity.isSponsored ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      <span className="text-xs text-app-primary">{activity.isSponsored ? "Yes" : "No"}</span>
                    </div>
                  </div>

                  {/* Fee Amount */}
                  {activity.feeAmount && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-app-secondary">Relay Fee</span>
                      <span className="text-xs font-mono text-app-primary">
                        {formatEthAmount(BigInt(activity.feeAmount) - BigInt(activity.feeRefund || 0), {
                          maxDecimals: 6,
                        })}{" "}
                        ETH
                        {activity.feeRefund &&
                          BigInt(activity.feeRefund) > 0n &&
                          (() => {
                            const feeAmount = Number(activity.feeAmount);
                            const feeRefund = Number(activity.feeRefund);
                            const savingsPercent = ((feeRefund / feeAmount) * 100).toFixed(2);
                            return (
                              <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                                ({savingsPercent}% saved)
                              </span>
                            );
                          })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pool Information */}
            <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-app">
                <h3 className="text-sm font-semibold text-app-primary">Pool</h3>
              </div>

              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-app-primary">{formatHash(activity.poolId || "")}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activity.poolId || "", "Pool Address")}
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                  <a
                    href={`${NETWORK.EXPLORER_URL}/address/${activity.poolId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-app-tertiary" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
