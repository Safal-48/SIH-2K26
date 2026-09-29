import { useState, useEffect, useCallback } from 'react';
import healthService from '../services/healthService.js';

/**
 * Custom hook to monitor backend health status with polling
 * @param {number} [pollInterval=10000] - Polling interval in ms (0 to disable)
 */
export function useHealthCheck(pollInterval = 10000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await healthService.getHealth();
      setData(res.data);
      setLastChecked(new Date());
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    if (pollInterval > 0) {
      const interval = setInterval(fetchHealth, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, pollInterval]);

  return { data, loading, error, lastChecked, refetch: fetchHealth };
}

export default useHealthCheck;
