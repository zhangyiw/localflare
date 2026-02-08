// API Client for Cloudflare Analytics Engine

import { STORAGE_KEYS, type ApiCredentials } from '@/components/analytics/hooks/use-local-storage';
import { getApiBase } from '@/lib/api';

const API_BASE = `${getApiBase()}/analytics`;

export interface Dataset {
  id: string;
  name: string;
}

export interface DatasetColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  meta: { name: string; type: string }[];
  rowCount: number;
  totalRows: number;
  error?: string;
  message?: string;
}

// Get credentials from localStorage (non-reactive, for API calls)
function getStoredCredentials(): ApiCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.apiCredentials);
    if (stored) {
      return JSON.parse(stored) as ApiCredentials;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get credentials from localStorage and add to headers if present
    const credentials = getStoredCredentials();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials?.accountId && credentials?.apiToken) {
      headers['X-CF-Account-ID'] = credentials.accountId;
      headers['X-CF-API-Token'] = credentials.apiToken;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data as T;
  }

  // List all datasets from Analytics Engine
  async getDatasets(): Promise<Dataset[]> {
    const result = await this.request<{ datasets: Dataset[] }>('/datasets');
    return result.datasets;
  }

  // Get schema for a specific dataset
  async getDatasetSchema(datasetId: string): Promise<DatasetColumn[]> {
    const result = await this.request<{
      datasetId: string;
      columns: DatasetColumn[];
    }>(`/datasets/${encodeURIComponent(datasetId)}/schema`);
    return result.columns;
  }

  // Execute a SQL query
  async executeQuery(
    query: string,
    params?: Record<string, string | number>
  ): Promise<QueryResult> {
    return this.request<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ query, params }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const apiClient = new ApiClient();
