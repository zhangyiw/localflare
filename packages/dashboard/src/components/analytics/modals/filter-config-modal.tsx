import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Delete02Icon,
  ArrowDown01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/components/analytics/ui/field';
import { cn } from '@/lib/utils';
import type { DashboardFilter, FilterType, FilterOption } from '@/components/analytics/types/dashboard';

interface FilterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DashboardFilter[];
  onSave: (filters: DashboardFilter[]) => void;
}

interface FilterEditorState {
  id: string;
  name: string;
  parameterName: string;
  type: FilterType;
  defaultValue: string;
  defaultStartDate: string;
  defaultEndDate: string;
  options: FilterOption[];
}

const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  dateRange: 'Date Range',
  timeRange: 'Time Range',
  dropdown: 'Dropdown',
  text: 'Text Input',
};

function generateId() {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyFilter(): FilterEditorState {
  return {
    id: generateId(),
    name: '',
    parameterName: '',
    type: 'dateRange',
    defaultValue: '',
    defaultStartDate: '',
    defaultEndDate: '',
    options: [],
  };
}

function filterToEditorState(filter: DashboardFilter): FilterEditorState {
  const isDateRange = filter.type === 'dateRange';
  const dateValue = isDateRange && Array.isArray(filter.defaultValue) ? filter.defaultValue : ['', ''];

  return {
    id: filter.id,
    name: filter.name,
    parameterName: filter.parameterName,
    type: filter.type,
    defaultValue: !isDateRange ? (filter.defaultValue as string) || '' : '',
    defaultStartDate: dateValue[0] || '',
    defaultEndDate: dateValue[1] || '',
    options: filter.options || [],
  };
}

function editorStateToFilter(state: FilterEditorState): DashboardFilter {
  const isDateRange = state.type === 'dateRange';

  return {
    id: state.id,
    name: state.name,
    parameterName: state.parameterName,
    type: state.type,
    defaultValue: isDateRange
      ? [state.defaultStartDate, state.defaultEndDate]
      : state.defaultValue || undefined,
    options: state.type === 'dropdown' ? state.options : undefined,
    appliesTo: 'all',
  };
}

export function FilterConfigModal({
  isOpen,
  onClose,
  filters,
  onSave,
}: FilterConfigModalProps) {
  const [editingFilters, setEditingFilters] = useState<FilterEditorState[]>([]);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingFilters(filters.map(filterToEditorState));
      setExpandedFilter(filters.length > 0 ? filters[0].id : null);
    }
  }, [isOpen, filters]);

  const handleAddFilter = () => {
    const newFilter = createEmptyFilter();
    setEditingFilters([...editingFilters, newFilter]);
    setExpandedFilter(newFilter.id);
  };

  const handleRemoveFilter = (id: string) => {
    setEditingFilters(editingFilters.filter((f) => f.id !== id));
    if (expandedFilter === id) {
      setExpandedFilter(editingFilters[0]?.id || null);
    }
  };

  const handleUpdateFilter = (id: string, updates: Partial<FilterEditorState>) => {
    setEditingFilters(
      editingFilters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleAddOption = (filterId: string) => {
    const filter = editingFilters.find((f) => f.id === filterId);
    if (filter) {
      handleUpdateFilter(filterId, {
        options: [...filter.options, { label: '', value: '' }],
      });
    }
  };

  const handleUpdateOption = (
    filterId: string,
    index: number,
    updates: Partial<FilterOption>
  ) => {
    const filter = editingFilters.find((f) => f.id === filterId);
    if (filter) {
      const newOptions = [...filter.options];
      newOptions[index] = { ...newOptions[index], ...updates };
      handleUpdateFilter(filterId, { options: newOptions });
    }
  };

  const handleRemoveOption = (filterId: string, index: number) => {
    const filter = editingFilters.find((f) => f.id === filterId);
    if (filter) {
      handleUpdateFilter(filterId, {
        options: filter.options.filter((_, i) => i !== index),
      });
    }
  };

  const handleSave = () => {
    // Filter out incomplete filters and convert to DashboardFilter
    const validFilters = editingFilters
      .filter((f) => f.name.trim() && f.parameterName.trim())
      .map(editorStateToFilter);
    onSave(validFilters);
    onClose();
  };

  const handleClose = () => {
    setEditingFilters([]);
    setExpandedFilter(null);
    onClose();
  };

  // Auto-generate parameter name from display name
  const autoGenerateParamName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent size="lg" className="max-h-[85vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Dashboard Filters</AlertDialogTitle>
          <AlertDialogDescription>
            Configure filters that users can use to dynamically filter dashboard data.
            Use <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{parameterName}}'}</code> in
            your SQL queries to reference filter values.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {editingFilters.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={32}
                strokeWidth={1.5}
                className="mb-3 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                No filters configured yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAddFilter}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                Add Your First Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {editingFilters.map((filter) => (
                <div
                  key={filter.id}
                  className={cn(
                    'rounded-lg border',
                    expandedFilter === filter.id ? 'bg-muted/30' : ''
                  )}
                >
                  {/* Filter Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFilter(
                        expandedFilter === filter.id ? null : filter.id
                      )
                    }
                    className="flex w-full items-center gap-3 px-4 py-3"
                  >
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={14}
                      strokeWidth={2}
                      className={cn(
                        'text-muted-foreground transition-transform',
                        expandedFilter === filter.id ? '' : '-rotate-90'
                      )}
                    />
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium">
                        {filter.name || 'Untitled Filter'}
                      </span>
                      {filter.parameterName && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {`{{${filter.parameterName}}}`}
                        </span>
                      )}
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {FILTER_TYPE_LABELS[filter.type]}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFilter(filter.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                    </button>
                  </button>

                  {/* Filter Editor */}
                  {expandedFilter === filter.id && (
                    <div className="border-t px-4 py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel>Display Name</FieldLabel>
                          <Input
                            placeholder="Date Range"
                            value={filter.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              handleUpdateFilter(filter.id, {
                                name,
                                // Auto-generate param name if it's empty or matches auto-generated
                                parameterName:
                                  !filter.parameterName ||
                                  filter.parameterName ===
                                    autoGenerateParamName(filter.name)
                                    ? autoGenerateParamName(name)
                                    : filter.parameterName,
                              });
                            }}
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Parameter Name</FieldLabel>
                          <Input
                            placeholder="date_range"
                            value={filter.parameterName}
                            onChange={(e) =>
                              handleUpdateFilter(filter.id, {
                                parameterName: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, ''),
                              })
                            }
                            className="font-mono"
                          />
                          <FieldDescription>
                            Use in queries as <code>{`{{${filter.parameterName || 'param'}}}`}</code>
                          </FieldDescription>
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel>Filter Type</FieldLabel>
                        <Select
                          value={filter.type}
                          onValueChange={(v) => {
                            if (!v) return;
                            const newType = v as FilterType;
                            // Auto-set default value for timeRange filters
                            const updates: Partial<FilterEditorState> = { type: newType };
                            if (newType === 'timeRange' && !filter.defaultValue) {
                              updates.defaultValue = "'1' HOUR";
                            }
                            handleUpdateFilter(filter.id, updates);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>{FILTER_TYPE_LABELS[filter.type]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dateRange">
                              Date Range - Two date pickers for start/end
                            </SelectItem>
                            <SelectItem value="timeRange">
                              Time Range - Quick presets (last 30 mins, 1 hour, etc.)
                            </SelectItem>
                            <SelectItem value="dropdown">
                              Dropdown - Select from predefined options
                            </SelectItem>
                            <SelectItem value="text">
                              Text Input - Free-form text search
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {/* Type-specific configuration */}
                      {filter.type === 'dateRange' && (
                        <div className="rounded-md border bg-muted/20 p-4">
                          <div className="mb-3 text-xs font-medium">Default Date Range</div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field>
                              <FieldLabel className="text-xs">Start Date</FieldLabel>
                              <Input
                                type="date"
                                value={filter.defaultStartDate}
                                onChange={(e) =>
                                  handleUpdateFilter(filter.id, {
                                    defaultStartDate: e.target.value,
                                  })
                                }
                              />
                            </Field>
                            <Field>
                              <FieldLabel className="text-xs">End Date</FieldLabel>
                              <Input
                                type="date"
                                value={filter.defaultEndDate}
                                onChange={(e) =>
                                  handleUpdateFilter(filter.id, {
                                    defaultEndDate: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            In queries, use <code>{`{{${filter.parameterName || 'param'}_start}}`}</code> and{' '}
                            <code>{`{{${filter.parameterName || 'param'}_end}}`}</code>
                          </p>
                        </div>
                      )}

                      {filter.type === 'timeRange' && (
                        <div className="rounded-md border bg-muted/20 p-4">
                          <div className="mb-3 text-xs font-medium">Time Range Presets</div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Users can select from preset time ranges like "Last 30 mins", "Last 1 hour", etc.
                          </p>
                          <Field>
                            <FieldLabel className="text-xs">Default Value</FieldLabel>
                            <Select
                              value={filter.defaultValue || "'1' HOUR"}
                              onValueChange={(v) =>
                                handleUpdateFilter(filter.id, { defaultValue: v ?? "'1' HOUR" })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="'15' MINUTE">Last 15 minutes</SelectItem>
                                <SelectItem value="'30' MINUTE">Last 30 minutes</SelectItem>
                                <SelectItem value="'1' HOUR">Last 1 hour</SelectItem>
                                <SelectItem value="'6' HOUR">Last 6 hours</SelectItem>
                                <SelectItem value="'12' HOUR">Last 12 hours</SelectItem>
                                <SelectItem value="'24' HOUR">Last 24 hours</SelectItem>
                                <SelectItem value="'7' DAY">Last 7 days</SelectItem>
                                <SelectItem value="'30' DAY">Last 30 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <p className="mt-3 text-xs text-muted-foreground">
                            In queries, use: <code className="bg-muted px-1 rounded">{`timestamp >= NOW() - INTERVAL {{${filter.parameterName || 'param'}}}`}</code>
                          </p>
                        </div>
                      )}

                      {filter.type === 'dropdown' && (
                        <div className="rounded-md border bg-muted/20 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-medium">Dropdown Options</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddOption(filter.id)}
                            >
                              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
                              Add Option
                            </Button>
                          </div>

                          {filter.options.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-4">
                              No options defined. Add at least one option.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {filter.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    placeholder="Label"
                                    value={option.label}
                                    onChange={(e) =>
                                      handleUpdateOption(filter.id, index, {
                                        label: e.target.value,
                                        // Auto-generate value from label if empty
                                        value:
                                          !option.value ||
                                          option.value === option.label.toLowerCase().replace(/\s+/g, '_')
                                            ? e.target.value.toLowerCase().replace(/\s+/g, '_')
                                            : option.value,
                                      })
                                    }
                                    className="flex-1"
                                  />
                                  <Input
                                    placeholder="Value"
                                    value={option.value}
                                    onChange={(e) =>
                                      handleUpdateOption(filter.id, index, {
                                        value: e.target.value,
                                      })
                                    }
                                    className="flex-1 font-mono text-xs"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveOption(filter.id, index)}
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          <Field className="mt-3">
                            <FieldLabel className="text-xs">Default Value</FieldLabel>
                            <Select
                              value={filter.defaultValue}
                              onValueChange={(v) =>
                                handleUpdateFilter(filter.id, { defaultValue: v ?? '' })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {filter.options.find((o) => o.value === filter.defaultValue)?.label ||
                                    'Select default...'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {filter.options
                                  .filter((o) => o.value)
                                  .map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      )}

                      {filter.type === 'text' && (
                        <Field>
                          <FieldLabel>Default Value</FieldLabel>
                          <Input
                            placeholder="Optional default text"
                            value={filter.defaultValue}
                            onChange={(e) =>
                              handleUpdateFilter(filter.id, {
                                defaultValue: e.target.value,
                              })
                            }
                          />
                          <FieldDescription>
                            Pre-fill the text filter with this value
                          </FieldDescription>
                        </Field>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFilter}
                className="w-full"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                Add Filter
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter className="border-t pt-4">
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save Filters</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
