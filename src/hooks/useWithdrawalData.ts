import { useState } from 'react';
import { toast } from 'sonner';
import { 
  fetchStateTreeLeaves, 
  fetchApprovedLabelsFromIndexer, 
  fetchLatestASPRoot, 
  fetchPoolConfig 
} from '../services/queryService';
import { CONTRACTS } from '@/config/constants';

interface WithdrawalData {
  stateTreeLeaves: Array<{ leafIndex: string; leafValue: string }> | null;
  aspTreeLabels: Array<{ label: string }> | null;
  latestAspRoot: string | null;
  poolConfig: { scope: string } | null;
}

interface DataFetchState {
  isFetching: boolean;
  isComplete: boolean;
  error: string | null;
  data: WithdrawalData | null;
}

export function useWithdrawalData() {
  const [dataFetchState, setDataFetchState] = useState<DataFetchState>({
    isFetching: false,
    isComplete: false,
    error: null,
    data: null,
  });

  const fetchRequiredData = async (): Promise<boolean> => {
    setDataFetchState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const poolId = CONTRACTS.ETH_PRIVACY_POOL.toLowerCase();
      
      // Step 1: Get state tree commitments using centralized service
      const stateTreeLeaves = await fetchStateTreeLeaves();

      // Step 2: Get ASP tree labels using centralized service
      const aspLabels = await fetchApprovedLabelsFromIndexer();
      const aspTreeLabels = aspLabels.map(label => ({ label }));

      // Step 3: Get latest ASP root using centralized service
      const aspRootData = await fetchLatestASPRoot();
      const latestAspRoot = aspRootData.root;

      // Step 4: Get pool configuration using centralized service
      const poolConfig = await fetchPoolConfig(poolId);

      console.log(`✅ Data fetch completed:
        - State tree leaves: ${stateTreeLeaves.length}
        - ASP approved labels: ${aspTreeLabels.length}
        - Latest ASP root: ${latestAspRoot ? 'Found' : 'Not found'}
        - Pool config: ${poolConfig ? 'Found' : 'Not found'}`);

      setDataFetchState({
        isFetching: false,
        isComplete: true,
        error: null,
        data: {
          stateTreeLeaves,
          aspTreeLabels,
          latestAspRoot,
          poolConfig,
        },
      });

      return true;

    } catch (error) {
      console.error('Failed to fetch required data:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch required data from indexer';
      toast.error(message);
      
      setDataFetchState(prev => ({
        ...prev,
        isFetching: false,
        error: message
      }));
      return false;
    }
  };

  const resetDataFetch = () => {
    setDataFetchState({
      isFetching: false,
      isComplete: false,
      error: null,
      data: null,
    });
  };

  return {
    dataFetchState,
    fetchRequiredData,
    resetDataFetch,
  };
}