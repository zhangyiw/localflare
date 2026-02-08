// ============================================
// DATA SOURCE TYPES
// ============================================

export type ColumnType = 'blob' | 'double' | 'index';

export interface ColumnMapping {
  sourceColumn: string;       // e.g., "blob1", "double5", "index3"
  friendlyName: string;       // e.g., "Page URL", "Views", "User ID"
  columnType: ColumnType;     // derived from prefix
  description?: string;       // optional description
}

export interface DataSource {
  id: string;
  name: string;
  endpoint: string;           // mock endpoint path
  columnMappings: ColumnMapping[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CHART TYPES
// ============================================

export type ChartType =
  | 'area'
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'table'
  | 'stat';

export interface StatCardConfig {
  valueKey: string;           // Key to display as main value
  label?: string;             // Label above the value
  comparisonKey?: string;     // Key for comparison value
  comparisonLabel?: string;   // e.g., "vs last week"
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisKey?: string;
  yAxisKeys?: string[];
  colors?: string[];          // Override chart colors
  statConfig?: StatCardConfig; // For stat type
}

// ============================================
// TILE TYPES
// ============================================

export interface TilePosition {
  x: number;                  // Column position (0-based)
  y: number;                  // Row position (0-based)
  width: number;              // Columns to span (1-4)
  height: number;             // Rows to span (1-3)
}

export interface Tile {
  id: string;
  title: string;
  dataSourceId: string;
  query: string;              // SQL query
  chartConfig: ChartConfig;
  position: TilePosition;
  refreshInterval?: number;   // Auto-refresh in seconds
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FILTER TYPES
// ============================================

export type FilterType = 'dateRange' | 'timeRange' | 'dropdown' | 'text';

export interface FilterOption {
  label: string;
  value: string;
}

// Preset time range options for quick selection
// Values are formatted for Analytics Engine SQL: INTERVAL '15' MINUTE
export const TIME_RANGE_PRESETS: FilterOption[] = [
  { label: 'Last 15 minutes', value: "'15' MINUTE" },
  { label: 'Last 30 minutes', value: "'30' MINUTE" },
  { label: 'Last 1 hour', value: "'1' HOUR" },
  { label: 'Last 6 hours', value: "'6' HOUR" },
  { label: 'Last 12 hours', value: "'12' HOUR" },
  { label: 'Last 24 hours', value: "'24' HOUR" },
  { label: 'Last 7 days', value: "'7' DAY" },
  { label: 'Last 30 days', value: "'30' DAY" },
];

export interface DashboardFilter {
  id: string;
  name: string;               // Display name
  parameterName: string;      // Used in query substitution
  type: FilterType;
  defaultValue?: string | [string, string]; // Single or date range
  options?: FilterOption[];   // For dropdown type
  appliesTo: string[] | 'all'; // Tile IDs or 'all'
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  tiles: Tile[];
  filters: DashboardFilter[];
  gridColumns: number;        // 4 column default
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface DashboardState {
  dashboards: Dashboard[];
  dataSources: DataSource[];
  activeDashboardId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface TileEditorState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  tile: Partial<Tile> | null;
}

export interface FilterValues {
  [parameterName: string]: string | [string, string];
}

// ============================================
// SIDEBAR NAVIGATION
// ============================================

export type SidebarSection = 'dashboards' | 'dataSources' | 'settings';

export interface SidebarState {
  activeSection: SidebarSection;
  isCollapsed: boolean;
  expandedDashboards: boolean;
  expandedDataSources: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export type QueryResult = Record<string, unknown>[];

export interface QueryExecutionResult {
  data: QueryResult;
  isLoading: boolean;
  error: string | null;
}
