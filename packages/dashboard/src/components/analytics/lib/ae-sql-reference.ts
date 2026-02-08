// ============================================
// CLOUDFLARE ANALYTICS ENGINE SQL REFERENCE
// ============================================
// Based on: https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/

// ============================================
// AGGREGATE FUNCTIONS
// ============================================

export interface AggregateFunction {
  name: string;
  syntax: string;
  description: string;
  supportsDistinct?: boolean;
  category: 'basic' | 'statistical' | 'conditional' | 'ranking';
}

export const AGGREGATE_FUNCTIONS: AggregateFunction[] = [
  // Basic aggregations
  {
    name: 'COUNT',
    syntax: 'COUNT([DISTINCT] [column])',
    description: 'Returns the number of rows. Use COUNT() for all rows or COUNT(column) for non-null values.',
    supportsDistinct: true,
    category: 'basic',
  },
  {
    name: 'SUM',
    syntax: 'SUM([DISTINCT] column)',
    description: 'Returns the sum of column values.',
    supportsDistinct: true,
    category: 'basic',
  },
  {
    name: 'AVG',
    syntax: 'AVG([DISTINCT] column)',
    description: 'Returns the mean of column values.',
    supportsDistinct: true,
    category: 'basic',
  },
  {
    name: 'MIN',
    syntax: 'MIN(column)',
    description: 'Returns the minimum value of a column.',
    category: 'basic',
  },
  {
    name: 'MAX',
    syntax: 'MAX(column)',
    description: 'Returns the maximum value of a column.',
    category: 'basic',
  },
  // Statistical & Quantile
  {
    name: 'quantileExactWeighted',
    syntax: 'quantileExactWeighted(q)(column, weight)',
    description: 'Calculates the qth quantile weighted by another column. Useful for sampling-adjusted analytics.',
    category: 'statistical',
  },
  {
    name: 'argMax',
    syntax: 'argMax(arg, val)',
    description: 'Returns the arg value that corresponds to the maximum value of val.',
    category: 'statistical',
  },
  {
    name: 'argMin',
    syntax: 'argMin(arg, val)',
    description: 'Returns the arg value that corresponds to the minimum value of val.',
    category: 'statistical',
  },
  {
    name: 'first_value',
    syntax: 'first_value(column)',
    description: 'Returns the first value from a column.',
    category: 'statistical',
  },
  {
    name: 'last_value',
    syntax: 'last_value(column)',
    description: 'Returns the last value from a column.',
    category: 'statistical',
  },
  // Ranking
  {
    name: 'topK',
    syntax: 'topK(N)(column)',
    description: 'Returns the most common N values of a column. Defaults to 10.',
    category: 'ranking',
  },
  {
    name: 'topKWeighted',
    syntax: 'topKWeighted(N)(column, weight)',
    description: 'Returns the N most common values weighted by a secondary column.',
    category: 'ranking',
  },
  // Conditional
  {
    name: 'countIf',
    syntax: 'countIf(condition)',
    description: 'Returns the count of rows where condition evaluates to true.',
    category: 'conditional',
  },
  {
    name: 'sumIf',
    syntax: 'sumIf(column, condition)',
    description: 'Sums values where condition evaluates to true.',
    category: 'conditional',
  },
  {
    name: 'avgIf',
    syntax: 'avgIf(column, condition)',
    description: 'Averages values where condition evaluates to true.',
    category: 'conditional',
  },
];

// Simple aggregations for the visual builder
export const VISUAL_AGGREGATIONS = [
  { value: 'COUNT', label: 'Count', syntax: 'COUNT()' },
  { value: 'SUM', label: 'Sum', syntax: 'SUM(column)' },
  { value: 'AVG', label: 'Average', syntax: 'AVG(column)' },
  { value: 'MIN', label: 'Minimum', syntax: 'MIN(column)' },
  { value: 'MAX', label: 'Maximum', syntax: 'MAX(column)' },
  { value: 'countIf', label: 'Count If', syntax: 'countIf(condition)' },
];

// ============================================
// DATE & TIME FUNCTIONS
// ============================================

export interface DateTimeFunction {
  name: string;
  syntax: string;
  description: string;
  category: 'current' | 'extraction' | 'rounding' | 'conversion' | 'formatting';
}

export const DATE_TIME_FUNCTIONS: DateTimeFunction[] = [
  // Current time
  { name: 'now', syntax: 'now()', description: 'Returns the current time as a DateTime.', category: 'current' },
  { name: 'today', syntax: 'today()', description: 'Returns the current date as a Date.', category: 'current' },

  // Extraction
  { name: 'toYear', syntax: 'toYear(datetime)', description: 'Extracts the year component.', category: 'extraction' },
  { name: 'toMonth', syntax: 'toMonth(datetime)', description: 'Extracts the month component (1-12).', category: 'extraction' },
  { name: 'toDayOfWeek', syntax: 'toDayOfWeek(datetime)', description: 'Returns day of week (1=Monday to 7=Sunday).', category: 'extraction' },
  { name: 'toDayOfMonth', syntax: 'toDayOfMonth(datetime)', description: 'Extracts the day of month.', category: 'extraction' },
  { name: 'toHour', syntax: 'toHour(datetime)', description: 'Extracts the hour component.', category: 'extraction' },
  { name: 'toMinute', syntax: 'toMinute(datetime)', description: 'Extracts the minute component.', category: 'extraction' },
  { name: 'toSecond', syntax: 'toSecond(datetime)', description: 'Extracts the second component.', category: 'extraction' },

  // Rounding
  { name: 'toStartOfYear', syntax: 'toStartOfYear(datetime)', description: 'Rounds down to start of year.', category: 'rounding' },
  { name: 'toStartOfMonth', syntax: 'toStartOfMonth(datetime)', description: 'Rounds down to start of month.', category: 'rounding' },
  { name: 'toStartOfWeek', syntax: 'toStartOfWeek(datetime)', description: 'Rounds down to start of week.', category: 'rounding' },
  { name: 'toStartOfDay', syntax: 'toStartOfDay(datetime)', description: 'Rounds down to start of day.', category: 'rounding' },
  { name: 'toStartOfHour', syntax: 'toStartOfHour(datetime)', description: 'Rounds down to start of hour.', category: 'rounding' },
  { name: 'toStartOfFifteenMinutes', syntax: 'toStartOfFifteenMinutes(datetime)', description: 'Rounds down to nearest 15 minutes.', category: 'rounding' },
  { name: 'toStartOfTenMinutes', syntax: 'toStartOfTenMinutes(datetime)', description: 'Rounds down to nearest 10 minutes.', category: 'rounding' },
  { name: 'toStartOfFiveMinutes', syntax: 'toStartOfFiveMinutes(datetime)', description: 'Rounds down to nearest 5 minutes.', category: 'rounding' },
  { name: 'toStartOfMinute', syntax: 'toStartOfMinute(datetime)', description: 'Rounds down to start of minute.', category: 'rounding' },
  { name: 'toStartOfInterval', syntax: "toStartOfInterval(datetime, INTERVAL 'n' unit[, timezone])", description: 'Rounds down to nearest interval.', category: 'rounding' },
  { name: 'toDate', syntax: 'toDate(datetime)', description: 'Converts to Date (removes time component).', category: 'rounding' },

  // Conversion
  { name: 'toDateTime', syntax: "toDateTime(expression[, 'timezone'])", description: 'Converts to DateTime.', category: 'conversion' },
  { name: 'toUnixTimestamp', syntax: 'toUnixTimestamp(datetime)', description: 'Converts to Unix timestamp integer.', category: 'conversion' },

  // Formatting
  { name: 'formatDateTime', syntax: "formatDateTime(datetime, format[, timezone])", description: 'Formats datetime as string.', category: 'formatting' },
  { name: 'toYYYYMM', syntax: 'toYYYYMM(datetime)', description: 'Returns YYYYMM numeric representation.', category: 'formatting' },
];

// Time grouping options for visual builder
export const TIME_GROUPINGS = [
  { value: 'minute', label: 'Per Minute', sql: 'toStartOfMinute(timestamp)' },
  { value: '5minutes', label: 'Per 5 Minutes', sql: 'toStartOfFiveMinutes(timestamp)' },
  { value: '10minutes', label: 'Per 10 Minutes', sql: 'toStartOfTenMinutes(timestamp)' },
  { value: '15minutes', label: 'Per 15 Minutes', sql: 'toStartOfFifteenMinutes(timestamp)' },
  { value: 'hour', label: 'Per Hour', sql: 'toStartOfHour(timestamp)' },
  { value: 'day', label: 'Per Day', sql: 'toDate(timestamp)' },
  { value: 'week', label: 'Per Week', sql: 'toStartOfWeek(timestamp)' },
  { value: 'month', label: 'Per Month', sql: 'toStartOfMonth(timestamp)' },
  { value: 'year', label: 'Per Year', sql: 'toStartOfYear(timestamp)' },
];

// ============================================
// STRING FUNCTIONS
// ============================================

export interface StringFunction {
  name: string;
  syntax: string;
  description: string;
}

export const STRING_FUNCTIONS: StringFunction[] = [
  { name: 'length', syntax: 'length(string)', description: 'Returns string length (UTF-8 compatible).' },
  { name: 'empty', syntax: 'empty(string)', description: 'Returns true if string is empty.' },
  { name: 'lower', syntax: 'lower(string)', description: 'Converts to lowercase (ASCII only).' },
  { name: 'lowerUTF8', syntax: 'lowerUTF8(string)', description: 'Converts to lowercase (Unicode compatible).' },
  { name: 'upper', syntax: 'upper(string)', description: 'Converts to uppercase (ASCII only).' },
  { name: 'upperUTF8', syntax: 'upperUTF8(string)', description: 'Converts to uppercase (Unicode compatible).' },
  { name: 'startsWith', syntax: 'startsWith(string, prefix)', description: 'Returns true if string starts with prefix.' },
  { name: 'endsWith', syntax: 'endsWith(string, suffix)', description: 'Returns true if string ends with suffix.' },
  { name: 'position', syntax: 'position(haystack, needle)', description: 'Returns 1-based position of needle in haystack.' },
  { name: 'substring', syntax: 'substring(string, start[, length])', description: 'Extracts substring from start position.' },
  { name: 'format', syntax: 'format(template, ...args)', description: 'Formats string with arguments.' },
  { name: 'extract', syntax: 'extract(unit FROM datetime)', description: 'Extracts time unit from datetime.' },
];

// ============================================
// MATHEMATICAL FUNCTIONS
// ============================================

export interface MathFunction {
  name: string;
  syntax: string;
  description: string;
}

export const MATH_FUNCTIONS: MathFunction[] = [
  { name: 'intDiv', syntax: 'intDiv(a, b)', description: 'Integer division (rounds down).' },
  { name: 'log', syntax: 'log(x)', description: 'Natural logarithm. Alias: ln.' },
  { name: 'pow', syntax: 'pow(base, exp)', description: 'Returns base raised to the power of exp.' },
  { name: 'round', syntax: 'round(x[, n])', description: 'Rounds to n decimal places.' },
  { name: 'floor', syntax: 'floor(x[, n])', description: 'Rounds down to n decimal places.' },
  { name: 'ceil', syntax: 'ceil(x[, n])', description: 'Rounds up to n decimal places.' },
];

// ============================================
// CONDITIONAL FUNCTIONS
// ============================================

export interface ConditionalFunction {
  name: string;
  syntax: string;
  description: string;
}

export const CONDITIONAL_FUNCTIONS: ConditionalFunction[] = [
  {
    name: 'if',
    syntax: 'if(condition, true_expr, false_expr)',
    description: 'Returns true_expr if condition is true, else false_expr.'
  },
];

// ============================================
// TYPE CONVERSION FUNCTIONS
// ============================================

export interface TypeConversionFunction {
  name: string;
  syntax: string;
  description: string;
}

export const TYPE_CONVERSION_FUNCTIONS: TypeConversionFunction[] = [
  { name: 'toUInt8', syntax: 'toUInt8(expr)', description: 'Converts to unsigned 8-bit integer.' },
  { name: 'toUInt32', syntax: 'toUInt32(expr)', description: 'Converts to unsigned 32-bit integer.' },
];

// ============================================
// BIT FUNCTIONS
// ============================================

export interface BitFunction {
  name: string;
  syntax: string;
  description: string;
}

export const BIT_FUNCTIONS: BitFunction[] = [
  { name: 'bitAnd', syntax: 'bitAnd(a, b)', description: 'Bitwise AND operation.' },
  { name: 'bitOr', syntax: 'bitOr(a, b)', description: 'Bitwise OR operation.' },
  { name: 'bitXor', syntax: 'bitXor(a, b)', description: 'Bitwise XOR operation.' },
  { name: 'bitNot', syntax: 'bitNot(a)', description: 'Inverts all bits.' },
  { name: 'bitCount', syntax: 'bitCount(a)', description: 'Counts bits set to 1.' },
  { name: 'bitTest', syntax: 'bitTest(a, n)', description: 'Returns the value of bit n.' },
  { name: 'bitShiftLeft', syntax: 'bitShiftLeft(a, n)', description: 'Shifts bits left by n positions.' },
  { name: 'bitShiftRight', syntax: 'bitShiftRight(a, n)', description: 'Shifts bits right by n positions.' },
  { name: 'bitRotateLeft', syntax: 'bitRotateLeft(a, n)', description: 'Rotates bits left by n positions.' },
  { name: 'bitRotateRight', syntax: 'bitRotateRight(a, n)', description: 'Rotates bits right by n positions.' },
  { name: 'bitHammingDistance', syntax: 'bitHammingDistance(x, y)', description: 'Returns number of differing bits.' },
];

// ============================================
// ENCODING FUNCTIONS
// ============================================

export interface EncodingFunction {
  name: string;
  syntax: string;
  description: string;
}

export const ENCODING_FUNCTIONS: EncodingFunction[] = [
  { name: 'bin', syntax: 'bin(expr)', description: 'Returns binary string representation.' },
  { name: 'hex', syntax: 'hex(expr)', description: 'Returns hexadecimal string representation.' },
];

// ============================================
// OPERATORS
// ============================================

export const OPERATORS = {
  arithmetic: [
    { symbol: '+', description: 'Addition' },
    { symbol: '-', description: 'Subtraction' },
    { symbol: '*', description: 'Multiplication' },
    { symbol: '/', description: 'Division' },
    { symbol: '%', description: 'Modulus' },
  ],
  comparison: [
    { symbol: '=', description: 'Equals' },
    { symbol: '<', description: 'Less than' },
    { symbol: '>', description: 'Greater than' },
    { symbol: '<=', description: 'Less than or equal' },
    { symbol: '>=', description: 'Greater than or equal' },
    { symbol: '<>', description: 'Not equal (also !=)' },
    { symbol: 'IN', description: 'Value in list' },
    { symbol: 'NOT IN', description: 'Value not in list' },
    { symbol: 'BETWEEN', description: 'Value in range (inclusive)' },
  ],
  boolean: [
    { symbol: 'AND', description: 'Logical AND' },
    { symbol: 'OR', description: 'Logical OR' },
    { symbol: 'NOT', description: 'Logical NOT' },
  ],
};

// ============================================
// SQL STATEMENT STRUCTURE
// ============================================

export const SQL_SYNTAX = {
  selectStatement: `SELECT <expression_list>
[FROM <table>|(<subquery>)]
[WHERE <expression>]
[GROUP BY <expression>, ...]
[ORDER BY <expression_list> [ASC|DESC]]
[LIMIT <n>|ALL]
[OFFSET <n>]
[FORMAT JSON|JSONEachRow|TabSeparated]`,

  limitations: [
    'Single table queries only (no JOIN, UNION)',
    'Subqueries supported in FROM clause',
    'LIMIT defaults to 10,000 if not specified',
  ],

  formatOptions: ['JSON', 'JSONEachRow', 'TabSeparated'],
};

// ============================================
// INTERVAL SYNTAX
// ============================================

export const INTERVAL_UNITS = ['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'];

// Example: INTERVAL '15' MINUTE or INTERVAL '7' DAY
export function buildIntervalSyntax(value: number, unit: string): string {
  return `INTERVAL '${value}' ${unit}`;
}

// ============================================
// ALL FUNCTIONS (for autocomplete/reference)
// ============================================

export const ALL_FUNCTIONS = [
  ...AGGREGATE_FUNCTIONS.map(f => ({ ...f, type: 'aggregate' as const })),
  ...DATE_TIME_FUNCTIONS.map(f => ({ ...f, type: 'datetime' as const })),
  ...STRING_FUNCTIONS.map(f => ({ ...f, type: 'string' as const })),
  ...MATH_FUNCTIONS.map(f => ({ ...f, type: 'math' as const })),
  ...CONDITIONAL_FUNCTIONS.map(f => ({ ...f, type: 'conditional' as const })),
  ...TYPE_CONVERSION_FUNCTIONS.map(f => ({ ...f, type: 'conversion' as const })),
  ...BIT_FUNCTIONS.map(f => ({ ...f, type: 'bit' as const })),
  ...ENCODING_FUNCTIONS.map(f => ({ ...f, type: 'encoding' as const })),
];

// Function categories for UI grouping
export const FUNCTION_CATEGORIES = [
  { id: 'aggregate', label: 'Aggregate Functions', functions: AGGREGATE_FUNCTIONS },
  { id: 'datetime', label: 'Date & Time Functions', functions: DATE_TIME_FUNCTIONS },
  { id: 'string', label: 'String Functions', functions: STRING_FUNCTIONS },
  { id: 'math', label: 'Mathematical Functions', functions: MATH_FUNCTIONS },
  { id: 'conditional', label: 'Conditional Functions', functions: CONDITIONAL_FUNCTIONS },
  { id: 'conversion', label: 'Type Conversion', functions: TYPE_CONVERSION_FUNCTIONS },
  { id: 'bit', label: 'Bit Functions', functions: BIT_FUNCTIONS },
  { id: 'encoding', label: 'Encoding Functions', functions: ENCODING_FUNCTIONS },
];
