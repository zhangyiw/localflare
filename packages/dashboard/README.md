# localflare-dashboard

React dashboard UI for [Localflare](https://www.npmjs.com/package/localflare). A modern, feature-rich interface for managing Cloudflare Worker bindings locally.

[![npm version](https://img.shields.io/npm/v/localflare-dashboard.svg)](https://www.npmjs.com/package/localflare-dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides the web-based dashboard UI for Localflare:

- **Modern React** - Built with React 19 and TypeScript
- **Beautiful UI** - Tailwind CSS 4 with Radix UI components
- **Feature Rich** - Full management interface for all Cloudflare bindings

## Features

### D1 Database Explorer

**Data Browser**
- Paginated table data with customizable page sizes (25, 50, 100, 250)
- Resizable columns with drag handles (max 400px width)
- Column visibility toggle - show/hide columns
- Global search across all columns
- Column-level filtering with operators:
  - Equals / Not equals
  - Contains / Starts with
  - Is null / Is not null
- Sorting modes:
  - Client-side sorting (current page only)
  - Server-side sorting via ORDER BY (sort all data)
- Inline cell editing with auto-save
- Row actions: Edit (dialog), Copy as JSON, Delete
- Bulk row selection and bulk delete
- Add new row via form dialog
- **Generate Dummy Data** - Insert 1-100 rows of realistic fake data using Faker.js
  - Supports all SQLite/D1 types: INTEGER, REAL, TEXT, DATE, DATETIME, TIMESTAMP, TIME, BOOLEAN, NUMERIC, DECIMAL, BLOB
  - Auto-skips auto-increment primary keys

**SQL Query Editor**
- Syntax highlighting with CodeMirror
- SQL autocomplete for table names, column names, and keywords
- Execute with keyboard shortcut (Cmd/Ctrl + Enter)
- Results displayed in table format
- Query history with re-run capability (stored in localStorage)

**Schema Viewer**
- View table structure with columns
- Column types, primary key indicators
- Row count per table

### KV Browser
- View all key-value pairs
- Edit values with JSON support
- Bulk delete operations
- Search and filter keys

### R2 File Manager
- Browse objects in buckets
- Upload and download files
- View object metadata
- Delete objects

### Queue Inspector
- View queue messages
- Send test messages
- Monitor queue activity

### Durable Objects
- List all DO namespaces
- View active instances
- Inspect instance state

## Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Modern utility-first CSS
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Powerful data fetching
- **TanStack Table** - Flexible table component
- **Vite** - Fast build tooling

## Related Packages

| Package | Description |
|---------|-------------|
| [`localflare`](https://www.npmjs.com/package/localflare) | CLI tool (main package) |
| [`localflare-core`](https://www.npmjs.com/package/localflare-core) | Config parser and utilities |
| [`localflare-api`](https://www.npmjs.com/package/localflare-api) | Dashboard API worker |

## License

MIT
