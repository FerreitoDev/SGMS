import { useState, useEffect, useCallback } from 'react';
import { ShiftAllocation } from '@/types/domain';
import { allocationsService } from '@/services/allocations-service';

export interface UseCurrentAllocationResult {
  allocation: ShiftAllocation | null;
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<ShiftAllocation | null>;
}

export function useCurrentAllocation(): UseCurrentAllocationResult {
  const [allocation, setAllocation] = useState<ShiftAllocation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown | null>(null);

  const fetchCurrent = useCallback(async (): Promise<ShiftAllocation | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await allocationsService.getCurrent();
      setAllocation(data);
      return data;
    } catch (err: unknown) {
      setError(err);
      setAllocation(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  return {
    allocation,
    isLoading,
    error,
    refetch: fetchCurrent,
  };
}

export default useCurrentAllocation;
