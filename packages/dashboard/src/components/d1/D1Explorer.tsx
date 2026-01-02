/**
 * D1 Database Explorer
 * 
 * A comprehensive database management interface inspired by Drizzle Studio and Supabase.
 * Provides full CRUD operations, SQL query execution, and schema visualization.
 * 
 * Features:
 * - Database and table navigation
 * - Inline cell editing with auto-save
 * - Row creation and deletion
 * - SQL query editor with syntax highlighting
 * - Query history with re-run capability
 * - Schema visualization
 * - Bulk operations
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Database02Icon,
  PlayIcon,
  Table01Icon,
  Add01Icon,
  RefreshIcon,
  Settings02Icon,
  CodeIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons'
import { d1Api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/ui/page-header'
import { StatsCard, StatsCardGroup } from '@/components/ui/stats-card'
import { DataTableLoading } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Toaster, toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

// D1 Component imports
import { SQLEditor } from './SQLEditor'
import { EditableDataTable } from './EditableDataTable'
import { RowEditorDialog } from './RowEditorDialog'
import { TableSchemaPanel } from './TableSchemaPanel'
import { QueryHistory } from './QueryHistory'
import {
  useD1TableInfo,
  useD1AllTableSchemas,
  usePagination,
  useQueryHistory,
  d1QueryKeys,
  type SortConfig,
} from './hooks'
import type {
  D1Row,
  D1CellValue,
  QueryHistoryEntry,
} from './types'
import type { SortingState } from '@tanstack/react-table'

// ============================================================================
// Main Component
// ============================================================================

export function D1Explorer() {
  // ============================================================================
  // State
  // ============================================================================
  
  const [selectedDb, setSelectedDb] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState<D1Row[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'data' | 'query' | 'schema'>('data')
  const [showRowEditor, setShowRowEditor] = useState(false)
  const [editingRow, setEditingRow] = useState<D1Row | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [serverSideSort, setServerSideSort] = useState(false)

  const queryClient = useQueryClient()
  const { pagination, updatePagination, goToPage, setPageSize } = usePagination(50)
  const { entries: historyEntries, addEntry: addHistoryEntry, clearHistory } = useQueryHistory()

  // ============================================================================
  // Queries
  // ============================================================================

  // Fetch databases
  const { data: databases, isLoading: loadingDatabases } = useQuery({
    queryKey: d1QueryKeys.databases(),
    queryFn: d1Api.list,
  })

  // Fetch schema for selected database
  const { data: schema } = useQuery({
    queryKey: d1QueryKeys.schema(selectedDb ?? ''),
    queryFn: () => (selectedDb ? d1Api.getSchema(selectedDb) : null),
    enabled: !!selectedDb,
  })

  // Fetch detailed table info
  const { data: tableInfo, isLoading: loadingTableInfo } = useD1TableInfo(selectedDb, selectedTable)

  // Fetch table rows (with optional server-side sorting)
  const { data: tableData, isLoading: loadingTableData, refetch: refetchRows } = useQuery({
    queryKey: d1QueryKeys.tableRows(
      selectedDb ?? '',
      selectedTable ?? '',
      pagination.pageIndex,
      pagination.pageSize,
      serverSideSort ? sortConfig?.column : undefined,
      serverSideSort ? sortConfig?.direction : undefined
    ),
    queryFn: () =>
      selectedDb && selectedTable
        ? d1Api.getRows(
            selectedDb,
            selectedTable,
            pagination.pageSize,
            pagination.pageIndex * pagination.pageSize,
            serverSideSort ? sortConfig?.column : undefined,
            serverSideSort ? sortConfig?.direction : undefined
          )
        : null,
    enabled: !!selectedDb && !!selectedTable,
  })

  // Update pagination when table info changes
  useEffect(() => {
    if (tableInfo) {
      updatePagination({ totalRows: tableInfo.rowCount })
    }
  }, [tableInfo, updatePagination])

  // ============================================================================
  // Mutations
  // ============================================================================

  // Execute SQL query
  const queryMutation = useMutation({
    mutationFn: async ({ sql }: { sql: string }) => {
      if (!selectedDb) throw new Error('No database selected')
      const startTime = Date.now()
      const result = await d1Api.query(selectedDb, sql)
      return { ...result, duration: Date.now() - startTime }
    },
    onSuccess: (data, variables) => {
      setQueryResult((data.results as D1Row[]) ?? [])
      setQueryError(null)
      
      // Add to history
      addHistoryEntry({
        sql: variables.sql,
        database: selectedDb!,
        success: true,
        duration: data.meta?.duration,
        rowCount: data.rowCount,
      })
      
      // Invalidate table data if it was a mutation
      const upperSql = variables.sql.trim().toUpperCase()
      if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('PRAGMA')) {
        queryClient.invalidateQueries({ queryKey: ['d1'] })
        toast.success('Query executed successfully', {
          description: `${data.meta?.changes ?? 0} rows affected`,
        })
      }
    },
    onError: (error, variables) => {
      const errorMessage = String(error)
      setQueryError(errorMessage)
      setQueryResult(null)
      
      // Add failed query to history
      addHistoryEntry({
        sql: variables.sql,
        database: selectedDb!,
        success: false,
        error: errorMessage,
      })
      
      toast.error('Query failed', { description: errorMessage })
    },
  })

  // Update cell
  const updateCellMutation = useMutation({
    mutationFn: async ({ 
      rowId, 
      column, 
      value 
    }: { 
      rowId: string
      column: string
      value: D1CellValue 
    }) => {
      if (!selectedDb || !selectedTable) throw new Error('No table selected')
      return d1Api.updateCell(selectedDb, selectedTable, rowId, column, value)
    },
    onSuccess: () => {
      refetchRows()
      toast.success('Cell updated')
    },
    onError: (error) => {
      toast.error('Failed to update cell', { description: String(error) })
    },
  })

  // Insert row
  const insertRowMutation = useMutation({
    mutationFn: async (data: Record<string, D1CellValue>) => {
      if (!selectedDb || !selectedTable) throw new Error('No table selected')
      return d1Api.insertRow(selectedDb, selectedTable, data as Record<string, unknown>)
    },
    onSuccess: () => {
      setShowRowEditor(false)
      setEditingRow(null)
      queryClient.invalidateQueries({ 
        queryKey: d1QueryKeys.tableInfo(selectedDb ?? '', selectedTable ?? '') 
      })
      refetchRows()
      toast.success('Row inserted')
    },
    onError: (error) => {
      toast.error('Failed to insert row', { description: String(error) })
    },
  })

  // Update row
  const updateRowMutation = useMutation({
    mutationFn: async ({ 
      rowId, 
      data 
    }: { 
      rowId: string
      data: Record<string, D1CellValue> 
    }) => {
      if (!selectedDb || !selectedTable) throw new Error('No table selected')
      return d1Api.updateRow(selectedDb, selectedTable, rowId, data as Record<string, unknown>)
    },
    onSuccess: () => {
      setShowRowEditor(false)
      setEditingRow(null)
      refetchRows()
      toast.success('Row updated')
    },
    onError: (error) => {
      toast.error('Failed to update row', { description: String(error) })
    },
  })

  // Delete row
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      if (!selectedDb || !selectedTable) throw new Error('No table selected')
      return d1Api.deleteRow(selectedDb, selectedTable, rowId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: d1QueryKeys.tableInfo(selectedDb ?? '', selectedTable ?? '') 
      })
      refetchRows()
      toast.success('Row deleted')
    },
    onError: (error) => {
      toast.error('Failed to delete row', { description: String(error) })
    },
  })

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRunQuery = useCallback(() => {
    if (sqlQuery.trim()) {
      queryMutation.mutate({ sql: sqlQuery })
    }
  }, [sqlQuery, queryMutation])

  const handleCellEdit = useCallback((rowId: string, columnId: string, value: D1CellValue) => {
    updateCellMutation.mutate({ rowId, column: columnId, value })
  }, [updateCellMutation])

  const handleRowDelete = useCallback((row: D1Row) => {
    if (!tableInfo) return
    
    // Get row ID from primary keys
    let rowId: string
    if (tableInfo.primaryKeys.length === 0) {
      rowId = JSON.stringify(row)
    } else if (tableInfo.primaryKeys.length === 1) {
      rowId = String(row[tableInfo.primaryKeys[0]])
    } else {
      rowId = JSON.stringify(tableInfo.primaryKeys.map(pk => row[pk]))
    }
    
    deleteRowMutation.mutate(rowId)
  }, [tableInfo, deleteRowMutation])

  const handleRowEdit = useCallback((row: D1Row) => {
    setEditingRow(row)
    setShowRowEditor(true)
  }, [])

  const handleRowSave = useCallback((data: Record<string, D1CellValue>) => {
    if (editingRow && tableInfo) {
      // Get row ID for update
      let rowId: string
      if (tableInfo.primaryKeys.length === 1) {
        rowId = String(editingRow[tableInfo.primaryKeys[0]])
      } else {
        rowId = JSON.stringify(tableInfo.primaryKeys.map(pk => editingRow[pk]))
      }
      updateRowMutation.mutate({ rowId, data })
    } else {
      insertRowMutation.mutate(data)
    }
  }, [editingRow, tableInfo, updateRowMutation, insertRowMutation])

  const handleHistorySelect = useCallback((entry: QueryHistoryEntry) => {
    setSqlQuery(entry.sql)
    if (entry.database !== selectedDb) {
      setSelectedDb(entry.database)
    }
    setActiveTab('query')
    setShowHistory(false)
  }, [selectedDb])

  const handleRefresh = useCallback(() => {
    refetchRows()
    queryClient.invalidateQueries({
      queryKey: d1QueryKeys.tableInfo(selectedDb ?? '', selectedTable ?? '')
    })
    toast.success('Data refreshed')
  }, [refetchRows, queryClient, selectedDb, selectedTable])

  // Handle sorting state change from table
  const handleSortingChange = useCallback((sorting: SortingState) => {
    if (sorting.length > 0) {
      setSortConfig({
        column: sorting[0].id,
        direction: sorting[0].desc ? 'desc' : 'asc',
      })
    } else {
      setSortConfig(null)
    }
  }, [])

  // Handle server-side sort toggle
  const handleServerSideSortChange = useCallback((enabled: boolean) => {
    setServerSideSort(enabled)
    // Reset to first page when toggling sort mode
    goToPage(0)
  }, [goToPage])

  // ============================================================================
  // Schema for SQL autocomplete - fetches all table columns
  // ============================================================================

  const tableNames = schema?.tables?.map(t => t.name)
  const { data: allTableSchemas } = useD1AllTableSchemas(selectedDb, tableNames)

  // ============================================================================
  // Render
  // ============================================================================

  if (loadingDatabases) {
    return (
      <div className="p-6">
        <DataTableLoading />
      </div>
    )
  }

  if (!databases?.databases.length) {
    return (
      <div className="p-6">
        <PageHeader
          icon={Database02Icon}
          iconColor="text-d1"
          title="D1 Databases"
          description="Manage your D1 SQLite databases"
        />
        <EmptyState
          icon={Database02Icon}
          title="No D1 databases configured"
          description="Add a D1 database binding to your wrangler.toml to get started"
          className="mt-8"
        />
        <Toaster />
      </div>
    )
  }

  const tableCount = schema?.tables?.length ?? 0
  const rowCount = tableInfo?.rowCount ?? 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PageHeader
          icon={Database02Icon}
          iconColor="text-d1"
          title="D1 Databases"
          description="Manage your D1 SQLite databases"
        />

        {/* Stats */}
        <StatsCardGroup className="mt-6">
          <StatsCard
            icon={Database02Icon}
            iconColor="text-d1"
            label="Databases"
            value={databases.databases.length}
          />
          <StatsCard
            icon={Table01Icon}
            iconColor="text-muted-foreground"
            label="Tables"
            value={tableCount}
            description={selectedDb ? `in ${selectedDb}` : 'Select a database'}
          />
          <StatsCard
            icon={Table01Icon}
            iconColor="text-muted-foreground"
            label="Rows"
            value={rowCount.toLocaleString()}
            description={selectedTable ? `in ${selectedTable}` : 'Select a table'}
          />
        </StatsCardGroup>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Database & Table List */}
        <div className="w-56 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Databases
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowHistory(!showHistory)}
              title="Query History"
            >
              <HugeiconsIcon 
                icon={Clock01Icon} 
                className={cn("size-3.5", showHistory && "text-primary")} 
                strokeWidth={2} 
              />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            {showHistory ? (
              <div className="p-2">
                <QueryHistory
                  entries={historyEntries}
                  onSelect={handleHistorySelect}
                  onClear={clearHistory}
                  maxEntries={20}
                />
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {databases.databases.map((db) => (
                  <div key={db.binding}>
                    <button
                      onClick={() => {
                        setSelectedDb(db.binding)
                        setSelectedTable(null)
                        goToPage(0)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors',
                        selectedDb === db.binding
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <HugeiconsIcon
                        icon={Database02Icon}
                        className={cn('size-4', selectedDb === db.binding && 'text-d1')}
                        strokeWidth={2}
                      />
                      {db.binding}
                    </button>

                    {selectedDb === db.binding && schema?.tables && (
                      <div className="ml-3 mt-1 pl-3 border-l border-border space-y-0.5">
                        {schema.tables.map((table) => (
                          <button
                            key={table.name}
                            onClick={() => {
                              setSelectedTable(table.name)
                              goToPage(0)
                            }}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors',
                              selectedTable === table.name
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <HugeiconsIcon
                              icon={Table01Icon}
                              className="size-3"
                              strokeWidth={2}
                            />
                            {table.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => setActiveTab(v as 'data' | 'query' | 'schema')} 
            className="flex-1 flex flex-col"
          >
            <div className="border-b border-border px-4 bg-muted/30 flex items-center justify-between">
              <TabsList className="h-11 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="data"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0"
                >
                  <HugeiconsIcon icon={Table01Icon} className="size-4 mr-1.5" strokeWidth={2} />
                  Data
                </TabsTrigger>
                <TabsTrigger
                  value="query"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0"
                >
                  <HugeiconsIcon icon={CodeIcon} className="size-4 mr-1.5" strokeWidth={2} />
                  SQL Query
                </TabsTrigger>
                <TabsTrigger
                  value="schema"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0"
                >
                  <HugeiconsIcon icon={Settings02Icon} className="size-4 mr-1.5" strokeWidth={2} />
                  Schema
                </TabsTrigger>
              </TabsList>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'data' && selectedTable && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      className="h-8"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className="size-4 mr-1.5" strokeWidth={2} />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingRow(null)
                        setShowRowEditor(true)
                      }}
                      className="h-8"
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4 mr-1.5" strokeWidth={2} />
                      Add Row
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Data Tab */}
            <TabsContent value="data" className="flex-1 m-0 overflow-auto p-4">
              {loadingTableData || loadingTableInfo ? (
                <DataTableLoading />
              ) : selectedTable && tableInfo && tableData?.rows ? (
                <EditableDataTable
                  schema={tableInfo}
                  data={tableData.rows}
                  pagination={pagination}
                  onPaginationChange={(p) => {
                    if (p.pageIndex !== undefined) goToPage(p.pageIndex)
                    if (p.pageSize !== undefined) setPageSize(p.pageSize)
                  }}
                  onCellEdit={handleCellEdit}
                  onRowDelete={handleRowDelete}
                  onRowEdit={handleRowEdit}
                  editable={true}
                  serverSideSort={serverSideSort}
                  onSortingChange={handleSortingChange}
                  onServerSideSortChange={handleServerSideSortChange}
                />
              ) : (
                <EmptyState
                  icon={Table01Icon}
                  title="Select a table"
                  description="Choose a table from the sidebar to view and edit its data"
                />
              )}
            </TabsContent>

            {/* Query Tab */}
            <TabsContent value="query" className="flex-1 m-0 flex flex-col">
              <div className="p-4 border-b border-border">
                <SQLEditor
                  value={sqlQuery}
                  onChange={setSqlQuery}
                  onExecute={handleRunQuery}
                  schema={allTableSchemas}
                  placeholder="Enter SQL query... (Ctrl/Cmd + Enter to execute)"
                  disabled={!selectedDb}
                  height="150px"
                />
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {selectedDb ? `Database: ${selectedDb}` : 'Select a database first'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 hidden sm:flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd>
                      <span className="ml-1">to run</span>
                    </span>
                  </div>
                  <Button
                    onClick={handleRunQuery}
                    disabled={!selectedDb || !sqlQuery.trim() || queryMutation.isPending}
                    size="sm"
                  >
                    <HugeiconsIcon icon={PlayIcon} className="size-4 mr-1.5" strokeWidth={2} />
                    {queryMutation.isPending ? 'Running...' : 'Run Query'}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {queryError && (
                  <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-mono">
                    {queryError}
                  </div>
                )}
                {queryResult && (
                  <div>
                    {queryResult.length > 0 ? (
                      <>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="overflow-auto max-h-125">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr className="border-b border-border">
                                  {Object.keys(queryResult[0]).map((key) => (
                                    <th
                                      key={key}
                                      className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                                    >
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-border">
                                {queryResult.map((row, i) => (
                                  <tr key={i}>
                                    {Object.values(row).map((value, j) => (
                                      <td key={j} className="px-4 py-2 font-mono text-xs">
                                        {value === null ? (
                                          <span className="text-muted-foreground/60 italic">NULL</span>
                                        ) : (
                                          String(value)
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {queryResult.length} row(s) returned
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Query executed successfully. No rows returned.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Schema Tab */}
            <TabsContent value="schema" className="flex-1 m-0 overflow-auto p-4">
              {loadingTableInfo ? (
                <DataTableLoading />
              ) : selectedTable && tableInfo ? (
                <TableSchemaPanel schema={tableInfo} />
              ) : (
                <EmptyState
                  icon={Settings02Icon}
                  title="Select a table"
                  description="Choose a table from the sidebar to view its schema"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Row Editor Dialog */}
      {tableInfo && (
        <RowEditorDialog
          open={showRowEditor}
          onOpenChange={setShowRowEditor}
          schema={tableInfo}
          row={editingRow}
          onSave={handleRowSave}
          isSaving={insertRowMutation.isPending || updateRowMutation.isPending}
        />
      )}

      <Toaster />
    </div>
  )
}

export default D1Explorer
