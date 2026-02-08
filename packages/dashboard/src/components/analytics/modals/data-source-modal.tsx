import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/analytics/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/components/analytics/ui/field';
import { ColumnMappingEditor } from '@/components/analytics/data-sources/column-mapping-editor';
import { useDatasets, useDatasetSchema } from '@/components/analytics/hooks/use-analytics-engine';
import type { DataSource, ColumnMapping, ColumnType } from '@/components/analytics/types/dashboard';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, RefreshIcon } from '@hugeicons/core-free-icons';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, endpoint: string, mappings: ColumnMapping[]) => void;
  dataSource?: DataSource | null;
  mode: 'create' | 'edit';
}

// Map Analytics Engine column types to our column types
function inferColumnType(columnName: string): ColumnType {
  if (columnName.startsWith('blob')) return 'blob';
  if (columnName.startsWith('double')) return 'double';
  if (columnName.startsWith('index') || columnName === '_sample_interval') return 'index';
  if (columnName === 'timestamp') return 'index';
  return 'blob';
}

export function DataSourceModal({
  isOpen,
  onClose,
  onSave,
  dataSource,
  mode,
}: DataSourceModalProps) {
  const [name, setName] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [manualDataset, setManualDataset] = useState('');
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Fetch available datasets
  const { datasets, isLoading: datasetsLoading, refetch: refetchDatasets } = useDatasets();

  // Use manual entry or selected dataset
  const effectiveDataset = datasets.length > 0 ? selectedDataset : manualDataset;

  // Fetch schema for selected dataset
  const { columns, isLoading: schemaLoading } = useDatasetSchema(effectiveDataset || null);

  // Reset form when modal opens/closes or dataSource changes
  useEffect(() => {
    if (isOpen) {
      if (dataSource) {
        setName(dataSource.name);
        setSelectedDataset(dataSource.endpoint);
        setManualDataset(dataSource.endpoint);
        setMappings(dataSource.columnMappings);
      } else {
        setName('');
        setSelectedDataset('');
        setManualDataset('');
        setMappings([]);
      }
    }
  }, [isOpen, dataSource]);

  // Auto-populate mappings when dataset schema is loaded
  useEffect(() => {
    if (columns.length > 0 && mappings.length === 0 && mode === 'create') {
      const autoMappings: ColumnMapping[] = columns
        .filter((col) => col.name !== '_sample_interval') // Exclude internal columns
        .map((col) => ({
          sourceColumn: col.name,
          friendlyName: col.name,
          columnType: inferColumnType(col.name),
          description: `Type: ${col.type}`,
        }));
      setMappings(autoMappings);
    }
  }, [columns, mappings.length, mode]);

  const handleDatasetChange = (value: string) => {
    setSelectedDataset(value);
    // Clear mappings when dataset changes (will be auto-populated)
    if (mode === 'create') {
      setMappings([]);
    }
    // Auto-set name if empty
    if (!name && value) {
      setName(value);
    }
  };

  const handleManualDatasetChange = (value: string) => {
    setManualDataset(value);
    // Clear mappings when dataset changes
    if (mode === 'create') {
      setMappings([]);
    }
    // Auto-set name if empty
    if (!name && value) {
      setName(value);
    }
  };

  const handleSave = () => {
    const dataset = datasets.length > 0 ? selectedDataset : manualDataset;
    if (name.trim() && dataset.trim()) {
      onSave(name.trim(), dataset.trim(), mappings);
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedDataset('');
    setManualDataset('');
    setMappings([]);
    onClose();
  };

  const isValid = name.trim() !== '' && effectiveDataset.trim() !== '';
  const showManualEntry = !datasetsLoading && datasets.length === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'create' ? 'New Data Source' : 'Edit Data Source'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Connect to a Cloudflare Analytics Engine dataset and configure column mappings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Dataset Selection */}
          <Field>
            <FieldLabel htmlFor="ds-dataset">Analytics Engine Dataset</FieldLabel>
            {showManualEntry ? (
              // Manual entry when no datasets are auto-discovered
              <div className="flex gap-2">
                <Input
                  id="ds-dataset"
                  placeholder="my_dataset"
                  value={manualDataset}
                  onChange={(e) => handleManualDatasetChange(e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => refetchDatasets()}
                  className="flex size-9 items-center justify-center rounded-md border hover:bg-accent"
                  title="Try auto-discover"
                >
                  <HugeiconsIcon
                    icon={datasetsLoading ? Loading03Icon : RefreshIcon}
                    size={16}
                    className={datasetsLoading ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            ) : (
              // Dropdown when datasets are available
              <div className="flex gap-2">
                <Select value={selectedDataset} onValueChange={(v) => v && handleDatasetChange(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue>
                      {selectedDataset || (datasetsLoading ? "Loading datasets..." : "Select a dataset")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => refetchDatasets()}
                  className="flex size-9 items-center justify-center rounded-md border hover:bg-accent"
                  title="Refresh datasets"
                >
                  <HugeiconsIcon
                    icon={datasetsLoading ? Loading03Icon : RefreshIcon}
                    size={16}
                    className={datasetsLoading ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            )}
            <FieldDescription>
              {showManualEntry
                ? "Enter your Analytics Engine dataset name"
                : "Select from your available Analytics Engine datasets"
              }
            </FieldDescription>
          </Field>

          {/* Name */}
          <Field>
            <FieldLabel htmlFor="ds-name">Display Name</FieldLabel>
            <Input
              id="ds-name"
              placeholder="Web Analytics"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldDescription>
              A friendly name to identify this data source in the UI
            </FieldDescription>
          </Field>

          {/* Column Mappings */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Column Mappings</label>
              {schemaLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                  Loading schema...
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {effectiveDataset
                ? "Columns will be auto-loaded from the dataset. Map them to friendly names."
                : "Enter a dataset name above to auto-load columns, or add mappings manually."
              }
            </p>
            <ColumnMappingEditor mappings={mappings} onChange={setMappings} />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={!isValid}>
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
