import { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartLineData01Icon,
  ChartHistogramIcon,
  ChartLineData02Icon,
  PieChartIcon,
  ChartScatterIcon,
  Table01Icon,
  Analytics01Icon,
  CodeIcon,
  ArrowDown01Icon,
  RotateClockwiseIcon,
} from '@hugeicons/core-free-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/analytics/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TILE_SIZE_PRESETS, getRecommendedSize, type TileSizePreset } from '@/components/analytics/dashboard/dashboard-grid';
import { VISUAL_AGGREGATIONS, TIME_GROUPINGS } from '@/components/analytics/lib/ae-sql-reference';
import type { Tile, DataSource, ChartType, ChartConfig, ColumnMapping, DashboardFilter } from '@/components/analytics/types/dashboard';

// Collapsible Section Component
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  onReset,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-left hover:bg-muted/50 transition-colors px-1"
      >
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              open ? "" : "-rotate-90"
            )}
          />
          <span className="text-sm font-medium">{title}</span>
        </div>
      </button>
      {open && (
        <div className="pb-4 px-1 space-y-3">
          {children}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={RotateClockwiseIcon} size={12} />
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface TileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tile: Omit<Tile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  tile?: Tile | null;
  dataSources: DataSource[];
  filters?: DashboardFilter[];
  mode: 'create' | 'edit';
}

const CHART_TYPES: { type: ChartType; label: string; icon: typeof ChartLineData01Icon }[] = [
  { type: 'line', label: 'Line', icon: ChartLineData02Icon },
  { type: 'bar', label: 'Bar', icon: ChartHistogramIcon },
  { type: 'area', label: 'Area', icon: ChartLineData01Icon },
  { type: 'pie', label: 'Pie', icon: PieChartIcon },
  { type: 'scatter', label: 'Scatter', icon: ChartScatterIcon },
  { type: 'stat', label: 'Stat', icon: Analytics01Icon },
  { type: 'table', label: 'Table', icon: Table01Icon },
];

// Aggregations and time groupings imported from ae-sql-reference

const SIZE_PRESETS: { preset: TileSizePreset; label: string }[] = [
  { preset: 'small', label: 'S' },
  { preset: 'medium', label: 'M' },
  { preset: 'wide', label: 'Wide' },
  { preset: 'tall', label: 'Tall' },
  { preset: 'large', label: 'L' },
  { preset: 'full', label: 'Full' },
];

type ConfigMode = 'visual' | 'sql';

export function TileEditorModal({
  isOpen,
  onClose,
  onSave,
  tile,
  dataSources,
  filters = [],
  mode,
}: TileEditorModalProps) {
  // Basic settings
  const [title, setTitle] = useState('');
  const [dataSourceId, setDataSourceId] = useState('');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [sizePreset, setSizePreset] = useState<TileSizePreset>('medium');

  // Config mode (visual builder vs raw SQL)
  const [configMode, setConfigMode] = useState<ConfigMode>('visual');

  // Visual config
  const [yAxisColumn, setYAxisColumn] = useState('');
  const [aggregation, setAggregation] = useState('COUNT');
  const [timeGrouping, setTimeGrouping] = useState('day');
  const [groupByColumn, setGroupByColumn] = useState('');
  const [limit, setLimit] = useState('100');

  // Raw SQL mode
  const [rawQuery, setRawQuery] = useState('');

  // Stat card specific
  const [statLabel, setStatLabel] = useState('');

  // Get selected data source and its columns
  const selectedDataSource = dataSources.find((ds) => ds.id === dataSourceId);
  const columns = selectedDataSource?.columnMappings || [];

  // Separate columns by type
  const numericColumns = columns.filter((c) => c.columnType === 'double');
  const textColumns = columns.filter((c) => c.columnType === 'blob');

  // Generate SQL from visual config
  const generatedQuery = useMemo(() => {
    if (!selectedDataSource) return '';

    const tableName = selectedDataSource.endpoint;

    if (chartType === 'stat') {
      // Single value query - Analytics Engine uses COUNT() without arguments
      if (aggregation === 'COUNT') {
        return `SELECT COUNT() as value FROM ${tableName}`;
      }
      const col = yAxisColumn || numericColumns[0]?.sourceColumn || 'double1';
      return `SELECT ${aggregation}(${col}) as value FROM ${tableName}`;
    }

    if (chartType === 'table') {
      // Table view - select all mapped columns
      const selectCols = columns.length > 0
        ? columns.map((c) => c.sourceColumn).join(', ')
        : '*';
      return `SELECT ${selectCols} FROM ${tableName} ORDER BY timestamp DESC LIMIT ${limit || 100}`;
    }

    if (chartType === 'pie') {
      // Pie chart - group by a text column
      const groupCol = groupByColumn || textColumns[0]?.sourceColumn || 'blob1';
      if (aggregation === 'COUNT') {
        return `SELECT ${groupCol} as label, COUNT() as value FROM ${tableName} GROUP BY ${groupCol} ORDER BY value DESC LIMIT 10`;
      }
      const valCol = yAxisColumn || numericColumns[0]?.sourceColumn || 'double1';
      return `SELECT ${groupCol} as label, ${aggregation}(${valCol}) as value FROM ${tableName} GROUP BY ${groupCol} ORDER BY value DESC LIMIT 10`;
    }

    // Time series charts (line, bar, area)
    const timeGroup = TIME_GROUPINGS.find((t) => t.value === timeGrouping);
    const timeExpr = timeGroup?.sql || 'toDate(timestamp)';

    let selectClause = `${timeExpr} as time`;
    let groupClause = 'time';

    if (aggregation === 'COUNT') {
      selectClause += ', COUNT() as value';
    } else {
      const valCol = yAxisColumn || numericColumns[0]?.sourceColumn || 'double1';
      selectClause += `, ${aggregation}(${valCol}) as value`;
    }

    // Add series grouping if specified
    if (groupByColumn) {
      selectClause += `, ${groupByColumn} as series`;
      groupClause += `, ${groupByColumn}`;
    }

    return `SELECT ${selectClause} FROM ${tableName} GROUP BY ${groupClause} ORDER BY time`;
  }, [selectedDataSource, chartType, aggregation, yAxisColumn, timeGrouping, groupByColumn, limit, columns, numericColumns, textColumns]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (tile) {
        setTitle(tile.title);
        setDataSourceId(tile.dataSourceId);
        setChartType(tile.chartConfig.type);
        setRawQuery(tile.query);
        setConfigMode('sql'); // Default to SQL mode when editing
        const matchingPreset = (Object.entries(TILE_SIZE_PRESETS) as [TileSizePreset, { width: number; height: number }][])
          .find(([, size]) => size.width === tile.position.width && size.height === tile.position.height)?.[0] || 'medium';
        setSizePreset(matchingPreset);
        if (tile.chartConfig.statConfig) {
          setStatLabel(tile.chartConfig.statConfig.label || '');
        }
      } else {
        setTitle('');
        setDataSourceId(dataSources[0]?.id || '');
        setChartType('line');
        setConfigMode('visual');
        setSizePreset('medium');
        setYAxisColumn('');
        setAggregation('COUNT');
        setTimeGrouping('day');
        setGroupByColumn('');
        setLimit('100');
        setRawQuery('');
        setStatLabel('');
      }
    }
  }, [isOpen, tile, dataSources]);

  // Update raw query when visual config changes
  useEffect(() => {
    if (configMode === 'visual' && generatedQuery) {
      setRawQuery(generatedQuery);
    }
  }, [configMode, generatedQuery]);

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    setSizePreset(getRecommendedSize(type));
  };

  const handleSave = () => {
    if (!title.trim() || !dataSourceId || !rawQuery.trim()) return;

    const chartConfig: ChartConfig = {
      type: chartType,
      showLegend: true,
      showGrid: true,
    };

    if (chartType === 'stat') {
      chartConfig.statConfig = {
        valueKey: 'value',
        label: statLabel || title,
        format: 'number',
      };
    }

    onSave({
      title: title.trim(),
      dataSourceId,
      query: rawQuery.trim(),
      chartConfig,
      position: { x: 0, y: 0, ...TILE_SIZE_PRESETS[sizePreset] },
    });
    onClose();
  };

  // Column selector component
  const ColumnSelect = ({
    value,
    onChange,
    columns: cols,
    placeholder,
    allowNone = false,
  }: {
    value: string;
    onChange: (v: string) => void;
    columns: ColumnMapping[];
    placeholder: string;
    allowNone?: boolean;
  }) => (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className="h-9">
        <SelectValue>{value || placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none__">None</SelectItem>}
        {cols.map((col) => (
          <SelectItem key={col.sourceColumn} value={col.sourceColumn}>
            {col.friendlyName} <span className="text-muted-foreground">({col.sourceColumn})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="full" className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between">
            <span>{mode === 'create' ? 'Add Visualization' : 'Edit Visualization'}</span>
            <div className="flex gap-1 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setConfigMode('visual')}
                className={cn(
                  'flex items-center gap-1 rounded px-3 py-1 text-sm',
                  configMode === 'visual' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setConfigMode('sql')}
                className={cn(
                  'flex items-center gap-1 rounded px-3 py-1 text-sm',
                  configMode === 'sql' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <HugeiconsIcon icon={CodeIcon} size={14} />
                SQL
              </button>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="grid gap-6 py-4 lg:grid-cols-[1fr,300px]">
          {/* Left side - Configuration */}
          <div className="space-y-5">
            {/* Row 1: Title + Data Source */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title</label>
                <Input
                  placeholder="My Chart"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Data Source</label>
                <Select value={dataSourceId} onValueChange={(v) => v && setDataSourceId(v)}>
                  <SelectTrigger>
                    <SelectValue>{dataSources.find(ds => ds.id === dataSourceId)?.name || 'Select data source'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Visual Configuration - Azure Data Explorer Style */}
            {configMode === 'visual' && selectedDataSource && (
              <div className="rounded-lg border bg-background">
                {/* Visual Type Dropdown */}
                <div className="border-b p-4">
                  <label className="mb-1.5 block text-sm font-medium">Visual type</label>
                  <Select value={chartType} onValueChange={(v) => v && handleChartTypeChange(v as ChartType)}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={CHART_TYPES.find(c => c.type === chartType)?.icon || ChartLineData02Icon} size={16} />
                        <span>{CHART_TYPES.find(c => c.type === chartType)?.label || 'Line'} chart</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map(({ type, label, icon }) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={icon} size={16} />
                            <span>{label} chart</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Section - for time series */}
                {(chartType === 'line' || chartType === 'bar' || chartType === 'area') && (
                  <CollapsibleSection
                    title="Data"
                    onReset={() => {
                      setYAxisColumn('');
                      setAggregation('COUNT');
                      setTimeGrouping('day');
                      setGroupByColumn('');
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm">Y columns</label>
                        <Select value={aggregation} onValueChange={(v) => v && setAggregation(v)}>
                          <SelectTrigger>
                            <SelectValue>{VISUAL_AGGREGATIONS.find(a => a.value === aggregation)?.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {VISUAL_AGGREGATIONS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aggregation !== 'COUNT' && (
                          <div className="mt-2">
                            <ColumnSelect
                              value={yAxisColumn}
                              onChange={setYAxisColumn}
                              columns={numericColumns}
                              placeholder="Select column"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">X column</label>
                        <Select value={timeGrouping} onValueChange={(v) => v && setTimeGrouping(v)}>
                          <SelectTrigger>
                            <SelectValue>{TIME_GROUPINGS.find(t => t.value === timeGrouping)?.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_GROUPINGS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">Series columns</label>
                        <ColumnSelect
                          value={groupByColumn}
                          onChange={setGroupByColumn}
                          columns={textColumns}
                          placeholder="None"
                          allowNone
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Split into multiple lines by this column</p>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Data Section - for pie chart */}
                {chartType === 'pie' && (
                  <CollapsibleSection
                    title="Data"
                    onReset={() => {
                      setYAxisColumn('');
                      setAggregation('COUNT');
                      setGroupByColumn('');
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm">Category column</label>
                        <ColumnSelect
                          value={groupByColumn}
                          onChange={setGroupByColumn}
                          columns={textColumns}
                          placeholder="Select column"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Each unique value becomes a slice</p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">Value</label>
                        <Select value={aggregation} onValueChange={(v) => v && setAggregation(v)}>
                          <SelectTrigger>
                            <SelectValue>{VISUAL_AGGREGATIONS.find(a => a.value === aggregation)?.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {VISUAL_AGGREGATIONS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aggregation !== 'COUNT' && (
                          <div className="mt-2">
                            <ColumnSelect
                              value={yAxisColumn}
                              onChange={setYAxisColumn}
                              columns={numericColumns}
                              placeholder="Select column"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Data Section - for scatter */}
                {chartType === 'scatter' && (
                  <CollapsibleSection
                    title="Data"
                    onReset={() => {
                      setYAxisColumn('');
                      setGroupByColumn('');
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm">X column</label>
                        <ColumnSelect
                          value={groupByColumn}
                          onChange={setGroupByColumn}
                          columns={numericColumns}
                          placeholder="Select column"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">Y column</label>
                        <ColumnSelect
                          value={yAxisColumn}
                          onChange={setYAxisColumn}
                          columns={numericColumns}
                          placeholder="Select column"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Data Section - for stat */}
                {chartType === 'stat' && (
                  <CollapsibleSection
                    title="Data"
                    onReset={() => {
                      setYAxisColumn('');
                      setAggregation('COUNT');
                      setStatLabel('');
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm">Value</label>
                        <Select value={aggregation} onValueChange={(v) => v && setAggregation(v)}>
                          <SelectTrigger>
                            <SelectValue>{VISUAL_AGGREGATIONS.find(a => a.value === aggregation)?.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {VISUAL_AGGREGATIONS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aggregation !== 'COUNT' && (
                          <div className="mt-2">
                            <ColumnSelect
                              value={yAxisColumn}
                              onChange={setYAxisColumn}
                              columns={numericColumns}
                              placeholder="Select column"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">Label</label>
                        <Input
                          value={statLabel}
                          onChange={(e) => setStatLabel(e.target.value)}
                          placeholder="Total Events"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Data Section - for table */}
                {chartType === 'table' && (
                  <CollapsibleSection
                    title="Data"
                    onReset={() => setLimit('100')}
                  >
                    <div>
                      <label className="mb-1.5 block text-sm">Row limit</label>
                      <Input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                  </CollapsibleSection>
                )}

                {/* Y Axis Section - for charts with Y axis */}
                {(chartType === 'line' || chartType === 'bar' || chartType === 'area' || chartType === 'scatter') && (
                  <CollapsibleSection title="Y Axis" defaultOpen={false}>
                    <div>
                      <label className="mb-1.5 block text-sm">Label</label>
                      <Input placeholder="Auto" disabled />
                      <p className="mt-1 text-xs text-muted-foreground">Y axis label (coming soon)</p>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Legend Section - for charts with legends */}
                {(chartType === 'line' || chartType === 'bar' || chartType === 'area' || chartType === 'pie') && (
                  <CollapsibleSection title="Legend" defaultOpen={false}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Show legend</label>
                        <span className="text-xs text-muted-foreground">Always on</span>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm">Legend location</label>
                        <Select value="bottom" disabled>
                          <SelectTrigger>
                            <SelectValue>Bottom</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom">Bottom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* Generated SQL Preview */}
                <div className="border-t p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Generated SQL</span>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setConfigMode('sql')}
                    >
                      Edit manually →
                    </button>
                  </div>
                  <pre className="rounded bg-muted p-2 text-xs overflow-x-auto font-mono max-h-24">{generatedQuery}</pre>
                </div>
              </div>
            )}

            {/* SQL Mode */}
            {configMode === 'sql' && (
              <div className="space-y-4">
                {/* Visual Type Selector in SQL mode */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Visual type</label>
                  <Select value={chartType} onValueChange={(v) => v && handleChartTypeChange(v as ChartType)}>
                    <SelectTrigger className="w-full max-w-xs">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={CHART_TYPES.find(c => c.type === chartType)?.icon || ChartLineData02Icon} size={16} />
                        <span>{CHART_TYPES.find(c => c.type === chartType)?.label || 'Line'} chart</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map(({ type, label, icon }) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={icon} size={16} />
                            <span>{label} chart</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">SQL Query</label>
                  <Textarea
                    value={rawQuery}
                    onChange={(e) => setRawQuery(e.target.value)}
                    placeholder="SELECT toDate(timestamp) as time, COUNT() as value FROM my_dataset GROUP BY time ORDER BY time"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Stat label for stat charts */}
                {chartType === 'stat' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Stat Label</label>
                    <Input
                      value={statLabel}
                      onChange={(e) => setStatLabel(e.target.value)}
                      placeholder="Total Events"
                      className="max-w-xs"
                    />
                  </div>
                )}

                {/* Column reference */}
                {selectedDataSource && columns.length > 0 && (
                  <div className="rounded border bg-muted/30 p-3">
                    <div className="mb-2 text-xs font-medium">Available Columns (click to copy)</div>
                    <div className="flex flex-wrap gap-1">
                      {columns.map((col) => (
                        <button
                          key={col.sourceColumn}
                          type="button"
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                          onClick={() => {
                            navigator.clipboard.writeText(col.sourceColumn);
                          }}
                        >
                          <span className="font-mono">{col.sourceColumn}</span>
                          <span className="text-muted-foreground">({col.friendlyName})</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Table: <code className="rounded bg-muted px-1">{selectedDataSource.endpoint}</code>
                    </div>
                  </div>
                )}

                {/* Filter Variables */}
                {filters.length > 0 && (
                  <div className="rounded border bg-blue-50 dark:bg-blue-950/30 p-3">
                    <div className="mb-2 text-xs font-medium">Filter Variables (click to copy)</div>
                    <div className="flex flex-wrap gap-1">
                      {filters.map((filter) => {
                        if (filter.type === 'dateRange') {
                          return (
                            <div key={filter.id} className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/50 px-2 py-1 text-xs hover:bg-blue-200 dark:hover:bg-blue-900"
                                onClick={() => navigator.clipboard.writeText(`{{${filter.parameterName}_start}}`)}
                              >
                                <span className="font-mono">{`{{${filter.parameterName}_start}}`}</span>
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/50 px-2 py-1 text-xs hover:bg-blue-200 dark:hover:bg-blue-900"
                                onClick={() => navigator.clipboard.writeText(`{{${filter.parameterName}_end}}`)}
                              >
                                <span className="font-mono">{`{{${filter.parameterName}_end}}`}</span>
                              </button>
                              <span className="text-xs text-muted-foreground self-center">({filter.name})</span>
                            </div>
                          );
                        }
                        if (filter.type === 'timeRange') {
                          return (
                            <div key={filter.id} className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded bg-green-100 dark:bg-green-900/50 px-2 py-1 text-xs hover:bg-green-200 dark:hover:bg-green-900"
                                onClick={() => navigator.clipboard.writeText(`INTERVAL {{${filter.parameterName}}}`)}
                              >
                                <span className="font-mono">{`INTERVAL {{${filter.parameterName}}}`}</span>
                              </button>
                              <span className="text-xs text-muted-foreground self-center">({filter.name})</span>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/50 px-2 py-1 text-xs hover:bg-blue-200 dark:hover:bg-blue-900"
                            onClick={() => navigator.clipboard.writeText(`{{${filter.parameterName}}}`)}
                          >
                            <span className="font-mono">{`{{${filter.parameterName}}}`}</span>
                            <span className="text-muted-foreground">({filter.name})</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>Date range: <code className="rounded bg-muted px-1">WHERE timestamp {'>'}= {`{{date_start}}`} AND timestamp {'<'}= {`{{date_end}}`}</code></div>
                      <div>Time range: <code className="rounded bg-muted px-1">WHERE timestamp {'>'}= NOW() - INTERVAL {`{{time_range}}`}</code></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side - Size selector */}
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="text-sm font-medium">Tile Size</div>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_PRESETS.map(({ preset, label }) => {
                const size = TILE_SIZE_PRESETS[preset];
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSizePreset(preset)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                      sizePreset === preset
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="grid h-12 w-16 grid-cols-4 gap-0.5">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        const isActive = col < size.width && row < size.height;
                        return (
                          <div
                            key={i}
                            className={cn(
                              'rounded-sm',
                              isActive
                                ? sizePreset === preset
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/40'
                                : 'bg-muted'
                            )}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick tips */}
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Tips</div>
              <ul className="list-inside list-disc space-y-1">
                <li>Use Visual mode for quick chart setup</li>
                <li>Switch to SQL for custom queries</li>
                <li>Time series charts need a "time" column</li>
                <li>Stat cards show a single value</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={!title.trim() || !dataSourceId || !rawQuery.trim()}
          >
            {mode === 'create' ? 'Add Tile' : 'Save Changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
