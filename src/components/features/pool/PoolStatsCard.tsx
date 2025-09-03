/**
 * Pool Statistics Card
 * Displays pool overview stats like total deposits and member count
 */

import { formatEthAmount } from "@/utils/formatters";

interface PoolStatsCardProps {
  totalDeposits: bigint;
  memberCount: number;
  loading?: boolean;
}

export function PoolStatsCard({ totalDeposits, memberCount, loading = false }: PoolStatsCardProps) {
  return (
    <div className="bg-app-surface p-4 border border-app rounded-xl shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-2xl font-bold text-app-primary tabular-nums">
            {loading ? "..." : `${formatEthAmount(totalDeposits, { decimals: 4 })} ETH`}
          </p>
          <p className="text-sm text-app-secondary">Total Pool Value</p>
        </div>
        <div className="flex flex-col text-right">
          <p className="text-2xl font-bold text-app-primary tabular-nums">
            {loading ? "..." : memberCount}
          </p>
          <p className="text-sm text-app-secondary">Active Members</p>
        </div>
      </div>
    </div>
  );
}