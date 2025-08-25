import { useState } from 'react';
import { useBanner } from '@/contexts/BannerContext';
import { fetchWithdrawalData, type WithdrawalDataResult } from '../../services/withdrawalDataService';

interface DataFetchState {
  isFetching: boolean;
  isComplete: boolean;
  error: string | null;
  data: WithdrawalDataResult | null;
}

export function useWithdrawalData() {
  const { banner } = useBanner();
  const [dataFetchState, setDataFetchState] = useState<DataFetchState>({
    isFetching: false,
    isComplete: false,
    error: null,
    data: null,
  });

  const fetchRequiredData = async (): Promise<boolean> => {
    setDataFetchState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const data = await fetchWithdrawalData();

      setDataFetchState({
        isFetching: false,
        isComplete: true,
        error: null,
        data,
      });

      return true;
    } catch (error) {
      console.error('Failed to fetch required data:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch required data from indexer';
      banner.error(message);
      
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