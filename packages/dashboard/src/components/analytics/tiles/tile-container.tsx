import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TileHeader } from './tile-header';
import { ChartTile } from './chart-tile';
import { TableTile } from './table-tile';
import { StatCardTile } from './stat-card-tile';
import { apiClient } from '@/components/analytics/lib/api-client';
import { executeMockQuery } from '@/components/analytics/data/mock-query-results';
import { cn } from '@/lib/utils';
import type { Tile, DataSource, FilterValues } from '@/components/analytics/types/dashboard';

/**
 * Convert string numbers to actual numbers.
 * Analytics Engine API returns UInt64 values as strings to avoid JS precision issues.
 */
function convertStringNumbers(data: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!data || data.length === 0) return data;

  return data.map(row => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      // Convert string numbers to actual numbers
      if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
        const num = parseFloat(value);
        // Only convert if it's a valid number and not too large for safe integer
        newRow[key] = !isNaN(num) ? num : value;
      } else {
        newRow[key] = value;
      }
    }
    return newRow;
  });
}

/**
 * Pivot data from long format to wide format for multi-series charts.
 *
 * Input (long format with "series" column):
 * [
 *   { time: '2024-12-03', value: 100, series: 'type_a' },
 *   { time: '2024-12-03', value: 50, series: 'type_b' },
 *   { time: '2024-12-04', value: 120, series: 'type_a' },
 * ]
 *
 * Output (wide format):
 * [
 *   { time: '2024-12-03', type_a: 100, type_b: 50 },
 *   { time: '2024-12-04', type_a: 120, type_b: null },
 * ]
 */
function pivotSeriesData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!data || data.length === 0) return data;

  // Check if data has a 'series' column
  const firstRow = data[0];
  const keys = Object.keys(firstRow);

  if (!keys.includes('series')) {
    return data; // No series column, return as-is
  }

  // Find the time/x-axis key (usually 'time', 'date', or first column)
  const xKey = keys.find(k => k === 'time' || k === 'date') || keys[0];

  // Find the value key (usually 'value' or first numeric column)
  const valueKey = keys.find(k => k === 'value') ||
    keys.find(k => typeof firstRow[k] === 'number' && k !== 'series') ||
    'value';

  // Get unique series values
  const seriesValues = [...new Set(data.map(row => String(row.series)))];

  // Get unique x-axis values
  const xValues = [...new Set(data.map(row => row[xKey]))];

  // Create pivoted data
  const pivotedMap = new Map<unknown, Record<string, unknown>>();

  // Initialize with all x values
  xValues.forEach(xVal => {
    const row: Record<string, unknown> = { [xKey]: xVal };
    // Initialize all series to null
    seriesValues.forEach(s => {
      row[s] = null;
    });
    pivotedMap.set(xVal, row);
  });

  // Fill in values
  data.forEach(row => {
    const xVal = row[xKey];
    const seriesVal = String(row.series);
    const value = row[valueKey];

    const pivotedRow = pivotedMap.get(xVal);
    if (pivotedRow) {
      pivotedRow[seriesVal] = value;
    }
  });

  // Convert to array and sort by x-axis if it looks like a date/time
  const result = Array.from(pivotedMap.values());

  // Try to sort by the x-axis column
  result.sort((a, b) => {
    const aVal = a[xKey];
    const bVal = b[xKey];
    if (aVal instanceof Date && bVal instanceof Date) {
      return aVal.getTime() - bVal.getTime();
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal);
    }
    return 0;
  });

  return result;
}

interface TileContainerProps {
  tile: Tile;
  dataSource?: DataSource;
  filterValues: FilterValues;
  onEdit: () => void;
  onDelete: () => void;
}

export function TileContainer({
  tile,
  dataSource,
  filterValues,
  onEdit,
  onDelete,
}: TileContainerProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert filter values to params for API
  const buildQueryParams = useCallback((values: FilterValues): Record<string, string | number> => {
    const params: Record<string, string | number> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        params[`${key}_start`] = value[0];
        params[`${key}_end`] = value[1];
      } else {
        params[key] = value;
      }
    });
    return params;
  }, []);

  // Process query with filter substitution for display
  const processQuery = useCallback((query: string, values: FilterValues): string => {
    let processed = query;
    Object.entries(values).forEach(([param, value]) => {
      // Handle ${param} style placeholders (legacy)
      const legacyPlaceholder = `\${${param}}`;
      // Handle {{param}} style placeholders (new)
      const newPlaceholder = `{{${param}}}`;

      if (Array.isArray(value)) {
        processed = processed
          .replace(legacyPlaceholder, `'${value[0]}' AND '${value[1]}'`)
          .replace(newPlaceholder, `'${value[0]}' AND '${value[1]}'`)
          .replace(`{{${param}_start}}`, `'${value[0]}'`)
          .replace(`{{${param}_end}}`, `'${value[1]}'`);
      } else {
        // Check if this is an INTERVAL value (e.g., "'15' MINUTE", "'7' DAY")
        // These already have proper formatting and shouldn't be wrapped in quotes
        const isIntervalValue = /^'\d+'\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)$/i.test(value);
        const escapedValue = isIntervalValue ? value : `'${value}'`;

        processed = processed
          .replace(legacyPlaceholder, escapedValue)
          .replace(newPlaceholder, escapedValue);
      }
    });
    return processed;
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check if this is a dummy/mock data source (always use mock data for these)
    const isDummyDataSource = tile.dataSourceId.startsWith('ds-dummy') ||
      dataSource?.name?.toLowerCase().includes('[dummy]') ||
      dataSource?.name?.toLowerCase().includes('(dummy)');

    try {
      if (dataSource && !isDummyDataSource) {
        // Try real API for non-dummy data sources
        const params = buildQueryParams(filterValues);
        const result = await apiClient.executeQuery(tile.query, params);

        if (result.error) {
          throw new Error(result.message || result.error);
        }

        // Convert string numbers to actual numbers (API returns UInt64 as strings)
        setData(convertStringNumbers(result.data));
      } else {
        // Use mock data for dummy data sources
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));
        const query = processQuery(tile.query, filterValues);
        const result = executeMockQuery(query, tile.dataSourceId);
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [tile.query, tile.dataSourceId, filterValues, dataSource, buildQueryParams, processQuery]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh if configured
  useEffect(() => {
    if (!tile.refreshInterval || tile.refreshInterval <= 0) return;

    const interval = setInterval(fetchData, tile.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [tile.refreshInterval, fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-sm text-destructive">{error}</span>
          <button
            onClick={handleRefresh}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (tile.chartConfig.type) {
      case 'stat':
        return (
          <StatCardTile
            config={tile.chartConfig.statConfig!}
            data={data}
          />
        );
      case 'table':
        return <TableTile data={data} />;
      default:
        // Pivot data if it contains a 'series' column for multi-line charts
        const chartData = pivotSeriesData(data);
        return (
          <ChartTile
            config={tile.chartConfig}
            data={chartData}
          />
        );
    }
  };

  return (
    <Card className={cn('group flex h-full flex-col overflow-hidden')}>
      <TileHeader
        title={tile.title}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        onRefresh={handleRefresh}
      />
      <CardContent className="relative flex-1 overflow-hidden p-0">
        <div className="absolute inset-0 p-3">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}
