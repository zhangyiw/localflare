import { Hono } from 'hono'
import type { Env } from '../types.js'

// Environment bindings for analytics (optional - credentials can come from headers)
interface AnalyticsCredentials {
  accountId: string | null
  apiToken: string | null
  source: 'headers' | 'env' | 'none'
}

// Helper to get credentials from headers or fallback to environment
function getCredentials(c: { req: { header: (name: string) => string | undefined }; env: Env }): AnalyticsCredentials {
  // First, check for credentials in headers (from browser localStorage)
  const headerAccountId = c.req.header('X-CF-Account-ID')
  const headerApiToken = c.req.header('X-CF-API-Token')

  if (headerAccountId && headerApiToken) {
    return { accountId: headerAccountId, apiToken: headerApiToken, source: 'headers' }
  }

  // Fall back to environment variables
  const envAccountId = c.env['CF_ACCOUNT_ID'] as string | undefined
  const envApiToken = c.env['CF_API_TOKEN'] as string | undefined

  if (envAccountId && envApiToken) {
    return { accountId: envAccountId, apiToken: envApiToken, source: 'env' }
  }

  return { accountId: null, apiToken: null, source: 'none' }
}

export function createAnalyticsRoutes() {
  const app = new Hono<{ Bindings: Env }>()

  // Health check
  app.get('/health', (c) => {
    const { source } = getCredentials(c)
    return c.json({
      status: 'ok',
      credentialsSource: source,
      hasCredentials: source !== 'none',
    })
  })

  // List available datasets from Analytics Engine
  app.get('/datasets', async (c) => {
    const { accountId, apiToken } = getCredentials(c)

    if (!accountId || !apiToken) {
      return c.json({
        error: 'Missing configuration',
        message: 'No API credentials found. Please configure your Cloudflare API credentials in Settings, or set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.',
        datasets: [],
      }, 400)
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'text/plain',
          },
          body: 'SHOW TABLES',
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to list datasets:', errorText)
        return c.json({
          error: 'Could not fetch datasets',
          details: errorText,
          datasets: [],
        }, 200)
      }

      const result = await response.json() as {
        data: Array<{ name: string }>
        meta: Array<{ name: string; type: string }>
      }

      const datasets = (result.data || []).map((row) => {
        const name = row.name || Object.values(row)[0] as string
        return { id: name, name }
      })

      return c.json({ datasets })
    } catch (error) {
      return c.json({
        error: 'Failed to fetch datasets',
        message: error instanceof Error ? error.message : 'Unknown error',
        datasets: [],
      }, 500)
    }
  })

  // Get dataset schema
  app.get('/datasets/:datasetId/schema', async (c) => {
    const { accountId, apiToken } = getCredentials(c)
    const datasetId = c.req.param('datasetId')

    if (!accountId || !apiToken) {
      return c.json({
        error: 'Missing configuration',
        message: 'No API credentials found. Please configure your Cloudflare API credentials in Settings.',
        columns: [],
      }, 400)
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'text/plain',
          },
          body: `SELECT * FROM ${datasetId} LIMIT 1`,
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return c.json({
          error: 'Failed to fetch schema',
          details: errorText,
          columns: [],
        }, 502)
      }

      const result = await response.json() as {
        data: Array<Record<string, unknown>>
        meta: Array<{ name: string; type: string }>
      }

      const columns = (result.meta || []).map((col) => ({
        name: col.name,
        type: col.type,
      }))

      return c.json({ datasetId, columns })
    } catch (error) {
      return c.json({
        error: 'Failed to fetch schema',
        message: error instanceof Error ? error.message : 'Unknown error',
        columns: [],
      }, 500)
    }
  })

  // Execute SQL query against Analytics Engine
  app.post('/query', async (c) => {
    const { accountId, apiToken } = getCredentials(c)

    if (!accountId || !apiToken) {
      return c.json({
        error: 'Missing configuration',
        message: 'No API credentials found. Please configure your Cloudflare API credentials in Settings, or set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.',
        data: [],
        meta: null,
      }, 400)
    }

    try {
      const body = await c.req.json<{
        query: string
        params?: Record<string, string | number>
      }>()

      let { query } = body
      const { params } = body

      // Simple parameter substitution (for filters)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`
          let escapedValue: string

          if (typeof value === 'string') {
            const isIntervalValue = /^'\d+'\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)$/i.test(value)

            if (isIntervalValue) {
              escapedValue = value
            } else {
              escapedValue = `'${value.replace(/'/g, "''")}'`
            }
          } else {
            escapedValue = String(value)
          }

          query = query.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escapedValue)
        })
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'text/plain',
          },
          body: query,
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return c.json({
          error: 'Query execution failed',
          message: errorText,
          query,
          data: [],
          meta: null,
        }, 502)
      }

      const result = await response.json() as {
        data: Array<Record<string, unknown>>
        meta: Array<{ name: string; type: string }>
        rows: number
        rows_before_limit_at_least: number
      }

      return c.json({
        data: result.data || [],
        meta: result.meta || [],
        rowCount: result.rows || 0,
        totalRows: result.rows_before_limit_at_least || result.rows || 0,
      })
    } catch (error) {
      return c.json({
        error: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        meta: null,
      }, 500)
    }
  })

  return app
}
