/**
 * Service for fetching withdrawal-related data
 * Consolidates data fetching logic from useWithdrawalData hook
 */

import { 
  fetchStateTreeLeaves, 
  fetchApprovedLabelsFromIndexer, 
  fetchLatestASPRoot, 
  fetchPoolConfig 
} from './queryService';
import { CONTRACTS } from '@/config/constants';

export interface WithdrawalDataResult {
  stateTreeLeaves: Array<{ leafIndex: string; leafValue: string }>;
  aspTreeLabels: Array<{ label: string }>;
  latestAspRoot: string;
  poolConfig: { scope: string };
}

/**
 * Fetches all required data for withdrawal operations
 */
export async function fetchWithdrawalData(): Promise<WithdrawalDataResult> {
  const poolId = CONTRACTS.ETH_PRIVACY_POOL.toLowerCase();
  
  // Fetch all data in parallel for better performance
  const [stateTreeLeaves, aspLabels, aspRootData, poolConfig] = await Promise.all([
    fetchStateTreeLeaves(),
    fetchApprovedLabelsFromIndexer(), 
    fetchLatestASPRoot(),
    fetchPoolConfig(poolId),
  ]);

  // Transform ASP labels to expected format
  const aspTreeLabels = aspLabels.map((label: string) => ({ label }));

  console.log(`✅ Withdrawal data fetch completed:
    - State tree leaves: ${stateTreeLeaves.length}
    - ASP approved labels: ${aspTreeLabels.length}
    - Latest ASP root: ${aspRootData.root ? 'Found' : 'Not found'}
    - Pool config: ${poolConfig ? 'Found' : 'Not found'}`);

  return {
    stateTreeLeaves,
    aspTreeLabels,
    latestAspRoot: aspRootData.root,
    poolConfig,
  };
}