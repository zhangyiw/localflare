import { useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Dataset } from '@/components/analytics/lib/api-client';
import type { ColumnMapping } from '@/components/analytics/types/dashboard';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  datasets?: Dataset[];
  columnMappings?: ColumnMapping[];
  placeholder?: string;
  className?: string;
  tableName?: string;
}

// SQL query templates - Analytics Engine uses COUNT() without arguments
const QUERY_TEMPLATES = [
  { label: 'Count all', query: (table: string) => `SELECT COUNT() as count FROM ${table}` },
  { label: 'Recent events', query: (table: string) => `SELECT * FROM ${table} ORDER BY timestamp DESC LIMIT 100` },
  { label: 'Group by day', query: (table: string) => `SELECT toDate(timestamp) as date, COUNT() as count FROM ${table} GROUP BY date ORDER BY date` },
  { label: 'Sum doubles', query: (table: string) => `SELECT SUM(double1) as total FROM ${table}` },
];

export function SqlEditor({
  value,
  onChange,
  datasets = [],
  columnMappings = [],
  placeholder,
  className,
  tableName,
}: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert text at cursor or append
  const insertText = useCallback((text: string, replace = false) => {
    if (replace) {
      onChange(text);
    } else {
      const newValue = value + (value.endsWith(' ') || value === '' ? '' : ' ') + text;
      onChange(newValue);
    }
    textareaRef.current?.focus();
  }, [value, onChange]);

  // Get effective table name
  const effectiveTable = tableName || datasets[0]?.id || 'my_dataset';

  return (
    <div className="space-y-3">
      {/* Query templates */}
      <div className="flex flex-wrap gap-1">
        <span className="text-xs font-medium text-muted-foreground">Templates:</span>
        {QUERY_TEMPLATES.map((template) => (
          <button
            key={template.label}
            type="button"
            className="rounded border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted"
            onClick={() => insertText(template.query(effectiveTable), true)}
          >
            {template.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn('font-mono text-sm', className)}
      />

      {/* Column reference - clickable to insert */}
      {(columnMappings.length > 0 || datasets.length > 0) && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium">Click to insert into query:</div>

          {/* Tables */}
          {datasets.length > 0 && (
            <div className="mb-2">
              <span className="mr-2 text-xs text-muted-foreground">Tables:</span>
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  className="mr-1 mb-1 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 font-mono text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800"
                  onClick={() => insertText(ds.id)}
                >
                  {ds.id}
                </button>
              ))}
            </div>
          )}

          {/* Columns with friendly names */}
          {columnMappings.length > 0 && (
            <div>
              <span className="mr-2 text-xs text-muted-foreground">Columns:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {columnMappings.map((col) => (
                  <button
                    key={col.sourceColumn}
                    type="button"
                    className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-800"
                    onClick={() => insertText(col.sourceColumn)}
                  >
                    <span className="font-mono text-green-700 dark:text-green-300">{col.sourceColumn}</span>
                    <span className="text-muted-foreground">({col.friendlyName})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show raw column names if no mappings but have schema columns */}
          {columnMappings.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No column mappings defined. Configure them in the Data Source to see available columns.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
