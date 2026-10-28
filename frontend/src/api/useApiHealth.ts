import { useState, useEffect, useCallback } from 'react';
import { api } from './client';
import type { HealthResponse } from './types';

export type HealthStatus = 'checking' | 'connected' | 'offline';

export function useApiHealth(pollIntervalMs: number = 20000) {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setData(res);
      setStatus('connected');
      setError(null);
    } catch (err: any) {
      setData(null);
      setStatus('offline');
      setError(err?.message || 'API connection failed');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    if (pollIntervalMs > 0) {
      const interval = setInterval(checkHealth, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, pollIntervalMs]);

  return { status, data, error, refetch: checkHealth };
}
