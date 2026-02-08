import type { DataSource } from '@/components/analytics/types/dashboard';

export const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: 'ds-dummy',
    name: '[Dummy] Sample Analytics',
    endpoint: 'sample_analytics',
    columnMappings: [
      { sourceColumn: 'blob1', friendlyName: 'Page URL', columnType: 'blob', description: 'The page URL visited' },
      { sourceColumn: 'blob2', friendlyName: 'Country', columnType: 'blob', description: 'Visitor country' },
      { sourceColumn: 'blob3', friendlyName: 'Device', columnType: 'blob', description: 'Device type (desktop, mobile, tablet)' },
      { sourceColumn: 'double1', friendlyName: 'Page Views', columnType: 'double', description: 'Number of page views' },
      { sourceColumn: 'double2', friendlyName: 'Visitors', columnType: 'double', description: 'Unique visitor count' },
      { sourceColumn: 'double3', friendlyName: 'Bounce Rate', columnType: 'double', description: 'Bounce rate percentage' },
      { sourceColumn: 'timestamp', friendlyName: 'Timestamp', columnType: 'index', description: 'Event timestamp' },
    ],
    createdAt: '2024-12-20T00:00:00Z',
    updatedAt: '2024-12-20T00:00:00Z',
  },
];

// Helper to get available columns for Analytics Engine
export const ANALYTICS_ENGINE_COLUMNS = {
  blobs: Array.from({ length: 20 }, (_, i) => `blob${i + 1}`),
  doubles: Array.from({ length: 20 }, (_, i) => `double${i + 1}`),
  indexes: Array.from({ length: 20 }, (_, i) => `index${i + 1}`),
};

export function getColumnType(columnName: string): 'blob' | 'double' | 'index' | null {
  if (columnName.startsWith('blob')) return 'blob';
  if (columnName.startsWith('double')) return 'double';
  if (columnName.startsWith('index')) return 'index';
  return null;
}
