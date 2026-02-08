import { useState, useEffect, useCallback } from 'react';
import { apiClient, type Dataset, type DatasetColumn, type QueryResult } from '@/components/analytics/lib/api-client';

// Hook to fetch available datasets
export function useDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDatasets();
      setDatasets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { datasets, isLoading, error, refetch };
}

// Hook to fetch dataset schema
export function useDatasetSchema(datasetId: string | null) {
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) {
      setColumns([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    apiClient.getDatasetSchema(datasetId)
      .then(setColumns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch schema'))
      .finally(() => setIsLoading(false));
  }, [datasetId]);

  return { columns, isLoading, error };
}

// Hook to execute queries
export function useQuery() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    query: string,
    params?: Record<string, string | number>
  ) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiClient.executeQuery(query, params);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query execution failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, execute, reset };
}

// Hook that caches query results for tiles
export function useTileQuery(
  query: string | null,
  params?: Record<string, string | number>,
  refreshInterval?: number
) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async () => {
    if (!query) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.executeQuery(query, params);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setIsLoading(false);
    }
  }, [query, params]);

  // Initial fetch
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(executeQuery, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, executeQuery]);

  return { data, isLoading, error, refetch: executeQuery };
}
