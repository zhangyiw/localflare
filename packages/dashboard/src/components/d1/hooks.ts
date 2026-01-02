/**
 * D1 Database Studio Hooks
 * 
 * Custom React hooks for managing D1 database state and operations.
 * Provides a clean abstraction over the API layer with optimistic updates.
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { d1Api } from '@/lib/api'
import type {
  D1Row,
  D1CellValue,
  D1TableSchema,
  D1Column,
  QueryHistoryEntry,
  PaginationState,
  RowSelectionState,
} from './types'

// ============================================================================
// Query Keys
// ============================================================================

export const d1QueryKeys = {
  all: ['d1'] as const,
  databases: () => [...d1QueryKeys.all, 'databases'] as const,
  schema: (binding: string) => [...d1QueryKeys.all, 'schema', binding] as const,
  tableInfo: (binding: string, table: string) =>
    [...d1QueryKeys.all, 'table-info', binding, table] as const,
  tableRows: (
    binding: string,
    table: string,
    page: number,
    pageSize: number,
    orderBy?: string,
    orderDir?: 'asc' | 'desc'
  ) =>
    [...d1QueryKeys.all, 'rows', binding, table, page, pageSize, orderBy, orderDir] as const,
}

// ============================================================================
// Database & Schema Hooks
// ============================================================================

/**
 * Hook to fetch all D1 databases
 */
export function useD1Databases() {
  return useQuery({
    queryKey: d1QueryKeys.databases(),
    queryFn: d1Api.list,
  })
}

/**
 * Hook to fetch schema for a specific database
 */
export function useD1Schema(binding: string | null) {
  return useQuery({
    queryKey: d1QueryKeys.schema(binding ?? ''),
    queryFn: () => (binding ? d1Api.getSchema(binding) : null),
    enabled: !!binding,
  })
}

/**
 * Hook to fetch all table schemas with columns for SQL autocomplete
 * Fetches column info for all tables in the database
 */
export function useD1AllTableSchemas(binding: string | null, tableNames: string[] | undefined) {
  return useQuery({
    queryKey: [...d1QueryKeys.all, 'all-schemas', binding, tableNames?.join(',') ?? ''],
    queryFn: async (): Promise<D1TableSchema[]> => {
      if (!binding || !tableNames?.length) return []
      
      // Fetch info for all tables in parallel
      const tableInfos = await Promise.all(
        tableNames.map(async (tableName) => {
          try {
            const info = await d1Api.getTableInfo(binding, tableName)
            const primaryKeys = info.columns
              .filter((col) => col.pk > 0)
              .sort((a, b) => a.pk - b.pk)
              .map((col) => col.name)
            
            return {
              name: info.table,
              columns: info.columns as D1Column[],
              primaryKeys,
              foreignKeys: [],
              indexes: [],
              rowCount: info.rowCount,
            }
          } catch {
            // If a table fails, return minimal info
            return {
              name: tableName,
              columns: [],
              primaryKeys: [],
              foreignKeys: [],
              indexes: [],
              rowCount: 0,
            }
          }
        })
      )
      
      return tableInfos
    },
    enabled: !!binding && !!tableNames?.length,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Hook to fetch detailed table information including columns
 */
export function useD1TableInfo(binding: string | null, table: string | null) {
  return useQuery({
    queryKey: d1QueryKeys.tableInfo(binding ?? '', table ?? ''),
    queryFn: async (): Promise<D1TableSchema | null> => {
      if (!binding || !table) return null
      
      const info = await d1Api.getTableInfo(binding, table)
      
      // Derive primary keys from columns
      const primaryKeys = info.columns
        .filter((col) => col.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((col) => col.name)
      
      return {
        name: info.table,
        columns: info.columns as D1Column[],
        primaryKeys,
        foreignKeys: [], // Would need additional PRAGMA call
        indexes: [], // Would need additional PRAGMA call
        rowCount: info.rowCount,
      }
    },
    enabled: !!binding && !!table,
  })
}

// ============================================================================
// Data Fetching Hooks
// ============================================================================

/**
 * Sort configuration for server-side sorting
 */
export interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

/**
 * Hook to fetch paginated table data with optional sorting
 */
export function useD1TableRows(
  binding: string | null,
  table: string | null,
  pagination: PaginationState,
  sort?: SortConfig | null
) {
  const offset = pagination.pageIndex * pagination.pageSize

  return useQuery({
    queryKey: d1QueryKeys.tableRows(
      binding ?? '',
      table ?? '',
      pagination.pageIndex,
      pagination.pageSize,
      sort?.column,
      sort?.direction
    ),
    queryFn: () =>
      binding && table
        ? d1Api.getRows(binding, table, pagination.pageSize, offset, sort?.column, sort?.direction)
        : null,
    enabled: !!binding && !!table,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for executing arbitrary SQL queries
 */
export function useD1Query(binding: string | null) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ sql, params = [] }: { sql: string; params?: unknown[] }) => {
      if (!binding) throw new Error('No database selected')
      return d1Api.query(binding, sql, params)
    },
    onSuccess: () => {
      // Invalidate all table data for this database
      queryClient.invalidateQueries({ 
        queryKey: [...d1QueryKeys.all, 'rows', binding] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...d1QueryKeys.all, 'table-info', binding] 
      })
    },
  })
}

/**
 * Hook for inserting a new row
 */
export function useD1InsertRow(binding: string | null, table: string | null) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Record<string, D1CellValue>) => {
      if (!binding || !table) throw new Error('No table selected')
      return d1Api.insertRow(binding, table, data as Record<string, unknown>)
    },
    onSuccess: () => {
      // Invalidate table data and info (row count changed)
      queryClient.invalidateQueries({ 
        queryKey: d1QueryKeys.tableInfo(binding ?? '', table ?? '') 
      })
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'd1' && 
          query.queryKey[1] === 'rows' &&
          query.queryKey[2] === binding &&
          query.queryKey[3] === table
      })
    },
  })
}

/**
 * Hook for updating a row
 */
export function useD1UpdateRow(binding: string | null, table: string | null) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      rowId, 
      data 
    }: { 
      rowId: string | number
      data: Record<string, D1CellValue> 
    }) => {
      if (!binding || !table) throw new Error('No table selected')
      return d1Api.updateRow(binding, table, String(rowId), data as Record<string, unknown>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'd1' && 
          query.queryKey[1] === 'rows' &&
          query.queryKey[2] === binding &&
          query.queryKey[3] === table
      })
    },
  })
}

/**
 * Hook for deleting a row
 */
export function useD1DeleteRow(binding: string | null, table: string | null) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (rowId: string | number) => {
      if (!binding || !table) throw new Error('No table selected')
      return d1Api.deleteRow(binding, table, String(rowId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: d1QueryKeys.tableInfo(binding ?? '', table ?? '') 
      })
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'd1' && 
          query.queryKey[1] === 'rows' &&
          query.queryKey[2] === binding &&
          query.queryKey[3] === table
      })
    },
  })
}

// ============================================================================
// UI State Hooks
// ============================================================================

/**
 * Hook for managing pagination state
 */
export function usePagination(initialPageSize = 50) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
    totalRows: 0,
    totalPages: 0,
  })
  
  const updatePagination = useCallback((updates: Partial<PaginationState>) => {
    setPagination(prev => {
      const next = { ...prev, ...updates }
      // Recalculate total pages when totalRows or pageSize changes
      if (updates.totalRows !== undefined || updates.pageSize !== undefined) {
        next.totalPages = Math.ceil(next.totalRows / next.pageSize)
      }
      return next
    })
  }, [])
  
  const goToPage = useCallback((pageIndex: number) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: Math.max(0, Math.min(pageIndex, prev.totalPages - 1)),
    }))
  }, [])
  
  const nextPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: Math.min(prev.pageIndex + 1, prev.totalPages - 1),
    }))
  }, [])
  
  const prevPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: Math.max(prev.pageIndex - 1, 0),
    }))
  }, [])
  
  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize,
      pageIndex: 0, // Reset to first page when changing page size
      totalPages: Math.ceil(prev.totalRows / pageSize),
    }))
  }, [])
  
  return {
    pagination,
    updatePagination,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  }
}

/**
 * Hook for managing row selection
 */
export function useRowSelection() {
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({})
  
  const toggleRow = useCallback((rowId: string) => {
    setSelectedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }))
  }, [])
  
  const selectAll = useCallback((rowIds: string[]) => {
    setSelectedRows(
      rowIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
    )
  }, [])
  
  const clearSelection = useCallback(() => {
    setSelectedRows({})
  }, [])
  
  const selectedRowIds = useMemo(
    () => Object.entries(selectedRows)
      .filter(([_, selected]) => selected)
      .map(([id]) => id),
    [selectedRows]
  )
  
  const selectedCount = selectedRowIds.length
  
  return {
    selectedRows,
    selectedRowIds,
    selectedCount,
    toggleRow,
    selectAll,
    clearSelection,
    setSelectedRows,
  }
}

/**
 * Hook for managing query history with localStorage persistence
 */
export function useQueryHistory(maxEntries = 50) {
  const STORAGE_KEY = 'localflare-d1-query-history'
  
  const [entries, setEntries] = useState<QueryHistoryEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  
  const addEntry = useCallback((
    entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>
  ) => {
    const newEntry: QueryHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    
    setEntries(prev => {
      const next = [newEntry, ...prev].slice(0, maxEntries)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [maxEntries])
  
  const clearHistory = useCallback(() => {
    setEntries([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])
  
  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [])
  
  return {
    entries,
    addEntry,
    clearHistory,
    removeEntry,
  }
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get primary key value from a row
 */
export function useGetRowId(schema: D1TableSchema | null) {
  return useCallback((row: D1Row): string => {
    if (!schema || schema.primaryKeys.length === 0) {
      // Fallback: use all column values as composite key
      return JSON.stringify(row)
    }
    
    if (schema.primaryKeys.length === 1) {
      return String(row[schema.primaryKeys[0]])
    }
    
    // Composite primary key
    const keyValues = schema.primaryKeys.map(pk => row[pk])
    return JSON.stringify(keyValues)
  }, [schema])
}

/**
 * Hook to detect if a column is editable
 */
export function useColumnEditability(schema: D1TableSchema | null) {
  return useCallback((columnName: string): boolean => {
    if (!schema) return false

    const column = schema.columns.find(c => c.name === columnName)
    if (!column) return false

    // Auto-increment primary keys are not directly editable
    if (column.pk === 1 && column.type.toUpperCase() === 'INTEGER') {
      return false
    }

    return true
  }, [schema])
}

