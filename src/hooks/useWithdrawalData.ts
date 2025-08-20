import { useState } from 'react';
import { toast } from 'sonner';
import { apolloClient } from '../lib/apollo';
import { gql } from '@apollo/client';
import { CONTRACTS } from '../config/contracts';

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
      
      // Step 1: Get state tree commitments from MerkleTreeLeaf entities
      console.log('📊 Fetching state tree commitments...');
      const stateTreeQuery = await apolloClient.query({
        query: gql`
          query GetStateTreeCommitments($poolId: String!) {
            merkleTreeLeafs(
              where: { poolId: $poolId }
              orderBy: "leafIndex"
              orderDirection: "asc"
            ) {
              items {
                leafIndex
                leafValue
                treeRoot
                treeSize
              }
            }
          }
        `,
        variables: { poolId },
        fetchPolicy: 'network-only',
      });

      // Step 2: Get ASP tree labels from approved Activity entities
      console.log('🏷️ Fetching ASP approved labels...');
      const aspLabelsQuery = await apolloClient.query({
        query: gql`
          query GetApprovedLabels {
            activitys(
              where: { type: "DEPOSIT", aspStatus: "approved" }
              orderBy: "timestamp"
              orderDirection: "asc"
            ) {
              items {
                label
                commitment
                timestamp
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
      });

      // Step 3: Get latest ASP root from AssociationSetUpdate entities
      console.log('🌳 Fetching latest ASP root...');
      const aspRootQuery = await apolloClient.query({
        query: gql`
          query GetLatestAspRoot {
            associationSetUpdates(
              orderBy: "timestamp"
              orderDirection: "desc"
              limit: 1
            ) {
              items {
                root
                ipfsCID
                timestamp
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
      });

      // Step 4: Get pool configuration
      console.log('⚙️ Fetching pool configuration...');
      const poolConfigQuery = await apolloClient.query({
        query: gql`
          query GetPoolConfig($poolId: String!) {
            pool(id: $poolId) {
              scope
              asset
              totalDeposits
              memberCount
            }
          }
        `,
        variables: { poolId },
        fetchPolicy: 'network-only',
      });

      // Process and store the fetched data
      const stateTreeLeaves = stateTreeQuery.data?.merkleTreeLeafs?.items || [];
      const aspTreeLabels = aspLabelsQuery.data?.activitys?.items?.filter((item: any) => item.label) || [];
      const latestAspRoot = aspRootQuery.data?.associationSetUpdates?.items?.[0]?.root || null;
      const poolConfig = poolConfigQuery.data?.pool || null;

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