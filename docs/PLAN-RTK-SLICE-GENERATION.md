# Plan: AI Generation of RTK Slices with JSON Autowiring

## Executive Summary

This document outlines a plan to extend `json-render` with the ability to:
1. **Generate Table Schemas via AI** - Define data structures for collections
2. **Generate RTK slices via AI** - For local UI state management
3. **Integrate TanStack DB** - For server data with reactive collections and live queries
4. **Generate Composable Selectors** - For derived state across both server and local data
5. **Autowire everything** into the generated JSON and code output

This enables sophisticated state management with clear separation:
- **Server Data** → TanStack DB Collections + Live Queries
- **Local UI State** → RTK Slices with Actions
- **Derived State** → Composable Selectors (memoized, cross-source)

---

## Current Architecture

### How It Works Today

```
User Prompt → AI → JSON (UITree) → React Renderer
                        ↓
              Data bound via paths to Context
```

**Current State Management:** React Context API
- `DataProvider` - manages data model with path-based binding
- Components reference data via `valuePath` props (e.g., `/revenue`)
- No Redux/RTK in the codebase

### Code Generation Flow

```
UITree → codegen/generator.ts → Standalone Next.js App
                                     ↓
                              Components + static data
```

---

## Proposed Architecture

### State Management Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER OVERVIEW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────┐    ┌─────────────────────┐            │
│   │   SERVER DATA       │    │   LOCAL UI STATE    │            │
│   │   (TanStack DB)     │    │   (RTK Slices)      │            │
│   ├─────────────────────┤    ├─────────────────────┤            │
│   │ • Collections       │    │ • UI preferences    │            │
│   │ • Live Queries      │    │ • Form state        │            │
│   │ • Optimistic Writes │    │ • Modal/drawer open │            │
│   │ • Real-time Sync    │    │ • Filter selections │            │
│   └──────────┬──────────┘    └──────────┬──────────┘            │
│              │                          │                        │
│              └──────────┬───────────────┘                        │
│                         ▼                                        │
│              ┌─────────────────────┐                             │
│              │   DERIVED STATE     │                             │
│              │   (Selectors)       │                             │
│              ├─────────────────────┤                             │
│              │ • Computed values   │                             │
│              │ • Filtered views    │                             │
│              │ • Aggregations      │                             │
│              │ • Cross-source joins│                             │
│              └─────────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Generation Flow (4 Phases)

```
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 1: TABLE SCHEMA GENERATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Prompt → AI → Table Schemas (Zod definitions)            │
│                              ↓                                   │
│                    Validate against Entity Catalog               │
│                              ↓                                   │
│              Output: db/schemas/{entity}Schema.ts               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│               PHASE 2: TANSTACK DB COLLECTIONS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI receives: Table Schemas + API patterns                      │
│                              ↓                                   │
│              AI → Collection Definitions                         │
│                              ↓                                   │
│   Output:                                                        │
│   - db/collections/{entity}Collection.ts                        │
│   - db/queries/{entity}Queries.ts (Live Queries)                │
│   - db/mutations/{entity}Mutations.ts (Optimistic)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 3: RTK SLICE GENERATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI receives: User Prompt + Table Schemas                       │
│                              ↓                                   │
│              AI → RTK Slice Definitions (local state only)       │
│                              ↓                                   │
│   Output:                                                        │
│   - store/slices/{sliceName}Slice.ts                            │
│   - store/index.ts (configureStore)                             │
│   - store/hooks.ts (typed hooks)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 4: SELECTOR GENERATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI receives: Collections + Slices + UI Requirements            │
│                              ↓                                   │
│              AI → Composable Selector Definitions                │
│                              ↓                                   │
│   Output:                                                        │
│   - selectors/index.ts (all selectors)                          │
│   - selectors/{domain}Selectors.ts (grouped by domain)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 5: UI GENERATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI receives: All definitions + Component Catalog               │
│                              ↓                                   │
│              AI → JSON (UITree) with bindings                    │
│                              ↓                                   │
│   Components bind to:                                            │
│   - Selectors: { selector: "selectFilteredUsers" }              │
│   - Collections: { collection: "users", query: "active" }       │
│   - Local state: { slice: "ui", path: "sidebarOpen" }           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. Table Schema Definitions (packages/core)

Define Zod schemas for database entities that TanStack DB collections will use:

```typescript
// packages/core/src/table-schema.ts

import { z } from "zod";

// Field type definitions that AI can generate
const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "json",
  "uuid",
]);

// Column/field definition
const ColumnSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  nullable: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  description: z.string().optional(),
  // Validation constraints
  constraints: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
});

// Relationship definition
const RelationshipSchema = z.object({
  name: z.string(),
  type: z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]),
  target: z.string(), // Target table name
  foreignKey: z.string().optional(),
  through: z.string().optional(), // For many-to-many
});

// Index definition for query optimization
const IndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  unique: z.boolean().optional().default(false),
});

// Complete table schema
export const TableSchemaDefinition = z.object({
  name: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/), // PascalCase
  description: z.string(),
  // Primary key field (defaults to 'id')
  primaryKey: z.string().optional().default("id"),
  columns: z.array(ColumnSchema),
  relationships: z.array(RelationshipSchema).optional(),
  indexes: z.array(IndexSchema).optional(),
  // Timestamps
  timestamps: z.boolean().optional().default(true), // createdAt, updatedAt
  softDelete: z.boolean().optional().default(false), // deletedAt
});

export type TableSchema = z.infer<typeof TableSchemaDefinition>;

// Collection of tables for a generation
export const DatabaseSchemaDefinition = z.object({
  tables: z.array(TableSchemaDefinition),
});

export type DatabaseSchema = z.infer<typeof DatabaseSchemaDefinition>;

// Helper to generate Zod schema from table definition
export function tableToZodSchema(table: TableSchema): string {
  const fields = table.columns.map(col => {
    let zodType = mapFieldTypeToZod(col.type);
    if (col.nullable) zodType += ".nullable()";
    if (col.constraints?.enum) {
      zodType = `z.enum([${col.constraints.enum.map(e => `"${e}"`).join(", ")}])`;
    }
    return `  ${col.name}: ${zodType},`;
  });

  if (table.timestamps) {
    fields.push("  createdAt: z.date(),");
    fields.push("  updatedAt: z.date(),");
  }
  if (table.softDelete) {
    fields.push("  deletedAt: z.date().nullable(),");
  }

  return `export const ${table.name}Schema = z.object({\n${fields.join("\n")}\n});

export type ${table.name} = z.infer<typeof ${table.name}Schema>;`;
}

function mapFieldTypeToZod(type: string): string {
  const map: Record<string, string> = {
    string: "z.string()",
    number: "z.number()",
    boolean: "z.boolean()",
    date: "z.date()",
    datetime: "z.date()",
    json: "z.unknown()",
    uuid: "z.string().uuid()",
  };
  return map[type] || "z.unknown()";
}
```

### 2. TanStack DB Collection Definitions (packages/core)

Define schemas for TanStack DB collections and live queries:

```typescript
// packages/core/src/collection-schema.ts

import { z } from "zod";

// Query operation types for live queries
const QueryOperatorSchema = z.enum([
  "eq", "neq", "gt", "gte", "lt", "lte",
  "in", "notIn", "contains", "startsWith", "endsWith",
  "isNull", "isNotNull"
]);

// Filter condition for queries
const FilterConditionSchema = z.object({
  field: z.string(),
  operator: QueryOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown())]).optional(),
  // For dynamic values from local state
  valueFrom: z.object({
    slice: z.string(),
    selector: z.string(),
  }).optional(),
});

// Sort definition
const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});

// Live Query definition
export const LiveQuerySchema = z.object({
  name: z.string(),
  description: z.string(),
  // Source collection(s)
  from: z.union([
    z.string(), // Single collection
    z.array(z.object({ // Multiple collections (join)
      collection: z.string(),
      alias: z.string().optional(),
    })),
  ]),
  // Join conditions (for multiple sources)
  joins: z.array(z.object({
    type: z.enum(["inner", "left", "right"]),
    on: z.object({
      left: z.string(), // alias.field
      right: z.string(), // alias.field
    }),
  })).optional(),
  // Where clause
  where: z.array(FilterConditionSchema).optional(),
  // Select specific fields (projection)
  select: z.array(z.union([
    z.string(), // Simple field
    z.object({ // Renamed/computed field
      field: z.string(),
      as: z.string(),
    }),
  ])).optional(),
  // Ordering
  orderBy: z.array(SortSchema).optional(),
  // Pagination
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type LiveQuery = z.infer<typeof LiveQuerySchema>;

// Collection definition
export const CollectionDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  // Reference to table schema
  schema: z.string(), // TableSchema name
  // Data source configuration
  source: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("query"),
      endpoint: z.string(),
      queryKey: z.array(z.string()),
      refetchInterval: z.number().optional(),
    }),
    z.object({
      type: z.literal("electric"),
      table: z.string(),
      where: z.string().optional(),
    }),
    z.object({
      type: z.literal("localStorage"),
      key: z.string(),
    }),
  ]),
  // Pre-defined live queries for this collection
  liveQueries: z.array(LiveQuerySchema).optional(),
});

export type CollectionDefinition = z.infer<typeof CollectionDefinitionSchema>;

// Optimistic mutation definition
export const MutationDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  type: z.enum(["insert", "update", "delete"]),
  // API endpoint for persistence
  endpoint: z.string(),
  method: z.enum(["POST", "PUT", "PATCH", "DELETE"]),
  // Optimistic update behavior
  optimistic: z.boolean().default(true),
  // Validation before mutation
  validate: z.array(z.object({
    field: z.string(),
    rule: z.string(), // Reference to validation rule
  })).optional(),
  // Side effects after mutation
  onSuccess: z.object({
    invalidate: z.array(z.string()).optional(), // Query keys to invalidate
    refetch: z.array(z.string()).optional(), // Collections to refetch
  }).optional(),
});

export type MutationDefinition = z.infer<typeof MutationDefinitionSchema>;

// Complete TanStack DB configuration
export const TanStackDBConfigSchema = z.object({
  collections: z.array(CollectionDefinitionSchema),
  mutations: z.array(MutationDefinitionSchema).optional(),
  // Global live queries that span multiple collections
  globalQueries: z.array(LiveQuerySchema).optional(),
});

export type TanStackDBConfig = z.infer<typeof TanStackDBConfigSchema>;
```

### 3. Enhanced Selector Schema with Derived State (packages/core)

Define composable selectors that can derive state from multiple sources:

```typescript
// packages/core/src/selector-schema.ts

import { z } from "zod";

// Data source for a selector
const DataSourceSchema = z.discriminatedUnion("type", [
  // From TanStack DB collection/query
  z.object({
    type: z.literal("collection"),
    collection: z.string(),
    query: z.string().optional(), // Live query name
  }),
  // From RTK slice
  z.object({
    type: z.literal("slice"),
    slice: z.string(),
    path: z.string(),
  }),
  // From another selector (composition)
  z.object({
    type: z.literal("selector"),
    selector: z.string(),
  }),
]);

// Transformation operations
const TransformOperationSchema = z.discriminatedUnion("op", [
  // Filter array
  z.object({
    op: z.literal("filter"),
    predicate: z.object({
      field: z.string(),
      operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
      value: z.unknown().optional(),
      valueFrom: z.object({ selector: z.string() }).optional(),
    }),
  }),
  // Map/transform items
  z.object({
    op: z.literal("map"),
    fields: z.array(z.union([
      z.string(), // Keep field as-is
      z.object({ from: z.string(), to: z.string() }), // Rename
      z.object({ // Computed field
        name: z.string(),
        compute: z.enum(["concat", "sum", "multiply", "format"]),
        args: z.array(z.string()),
      }),
    ])),
  }),
  // Sort
  z.object({
    op: z.literal("sort"),
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }),
  // Slice array
  z.object({
    op: z.literal("slice"),
    start: z.number().optional(),
    end: z.number().optional(),
  }),
  // Group by
  z.object({
    op: z.literal("groupBy"),
    field: z.string(),
  }),
  // Unique values
  z.object({
    op: z.literal("unique"),
    field: z.string().optional(),
  }),
]);

// Aggregation operations for derived values
const AggregationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("count") }),
  z.object({ type: z.literal("sum"), field: z.string() }),
  z.object({ type: z.literal("avg"), field: z.string() }),
  z.object({ type: z.literal("min"), field: z.string() }),
  z.object({ type: z.literal("max"), field: z.string() }),
  z.object({ type: z.literal("first") }),
  z.object({ type: z.literal("last") }),
  z.object({
    type: z.literal("reduce"),
    initial: z.unknown(),
    reducer: z.string(), // Function name from catalog
  }),
]);

// Complete selector definition
export const SelectorDefinitionSchema = z.object({
  name: z.string().regex(/^select[A-Z][a-zA-Z0-9]*$/), // selectXxx naming
  description: z.string(),

  // Input sources (can combine multiple)
  inputs: z.array(z.object({
    name: z.string(), // Local variable name
    source: DataSourceSchema,
  })),

  // Pipeline of transformations
  pipeline: z.array(TransformOperationSchema).optional(),

  // Final output type
  output: z.discriminatedUnion("type", [
    z.object({ type: z.literal("array") }), // Return transformed array
    z.object({ type: z.literal("single") }), // Return first item
    z.object({ type: z.literal("aggregation"), aggregation: AggregationSchema }),
    z.object({ // Return object with multiple aggregations
      type: z.literal("object"),
      fields: z.record(z.string(), AggregationSchema),
    }),
  ]),

  // Memoization configuration
  memoize: z.object({
    enabled: z.boolean().default(true),
    maxSize: z.number().optional(), // LRU cache size
    equalityFn: z.enum(["shallow", "deep", "reference"]).optional(),
  }).optional(),
});

export type SelectorDefinition = z.infer<typeof SelectorDefinitionSchema>;

// Collection of selectors
export const SelectorsConfigSchema = z.object({
  selectors: z.array(SelectorDefinitionSchema),
});

export type SelectorsConfig = z.infer<typeof SelectorsConfigSchema>;
```

### 4. Selector Code Generator

```typescript
// packages/codegen/src/selector-generator.ts

import { SelectorDefinition } from "@json-render/core";

export function generateSelectorCode(selector: SelectorDefinition): string {
  const { name, inputs, pipeline, output, memoize } = selector;

  // Generate imports based on input sources
  const imports = generateSelectorImports(inputs);

  // Generate the selector function
  const selectorBody = generateSelectorBody(inputs, pipeline, output);

  // Wrap with memoization if enabled
  const memoized = memoize?.enabled !== false;

  return `
${imports}
import { createSelector } from "@reduxjs/toolkit";
import { useLiveQuery } from "@tanstack/react-db";

/**
 * ${selector.description}
 */
${memoized ? generateMemoizedSelector(name, selectorBody, inputs) : generateSimpleSelector(name, selectorBody)}
`;
}

function generateSelectorImports(inputs: SelectorDefinition["inputs"]): string {
  const sliceImports = new Set<string>();
  const collectionImports = new Set<string>();
  const selectorImports = new Set<string>();

  for (const input of inputs) {
    switch (input.source.type) {
      case "slice":
        sliceImports.add(input.source.slice);
        break;
      case "collection":
        collectionImports.add(input.source.collection);
        break;
      case "selector":
        selectorImports.add(input.source.selector);
        break;
    }
  }

  const lines: string[] = [];

  if (sliceImports.size > 0) {
    for (const slice of sliceImports) {
      lines.push(`import { select${capitalize(slice)}State } from "../store/slices/${slice}Slice";`);
    }
  }

  if (collectionImports.size > 0) {
    for (const collection of collectionImports) {
      lines.push(`import { ${collection}Collection } from "../db/collections/${collection}Collection";`);
    }
  }

  if (selectorImports.size > 0) {
    lines.push(`import { ${Array.from(selectorImports).join(", ")} } from "./index";`);
  }

  return lines.join("\n");
}

function generateMemoizedSelector(
  name: string,
  body: string,
  inputs: SelectorDefinition["inputs"]
): string {
  // For RTK-only selectors, use createSelector
  const hasOnlySlices = inputs.every(i => i.source.type === "slice");

  if (hasOnlySlices) {
    const inputSelectors = inputs.map(i => {
      const source = i.source as { type: "slice"; slice: string; path: string };
      return `(state: RootState) => state.${source.slice}.${source.path}`;
    }).join(",\n    ");

    return `
export const ${name} = createSelector(
  [
    ${inputSelectors}
  ],
  (${inputs.map(i => i.name).join(", ")}) => {
    ${body}
  }
);`;
  }

  // For mixed sources, generate a React hook
  return `
export function use${name.replace(/^select/, "")}() {
  ${inputs.map(i => generateInputHook(i)).join("\n  ")}

  return useMemo(() => {
    ${body}
  }, [${inputs.map(i => i.name).join(", ")}]);
}`;
}

function generateInputHook(input: { name: string; source: any }): string {
  switch (input.source.type) {
    case "slice":
      return `const ${input.name} = useAppSelector(state => state.${input.source.slice}.${input.source.path});`;
    case "collection":
      if (input.source.query) {
        return `const { data: ${input.name} } = useLiveQuery(${input.source.collection}Collection.queries.${input.source.query});`;
      }
      return `const { data: ${input.name} } = useLiveQuery((q) => q.from({ items: ${input.source.collection}Collection }));`;
    case "selector":
      return `const ${input.name} = use${input.source.selector.replace(/^select/, "")}();`;
    default:
      return `const ${input.name} = null; // Unknown source type`;
  }
}

function generateSelectorBody(
  inputs: SelectorDefinition["inputs"],
  pipeline: SelectorDefinition["pipeline"],
  output: SelectorDefinition["output"]
): string {
  let result = inputs.length === 1 ? inputs[0].name : `{ ${inputs.map(i => i.name).join(", ")} }`;

  // Apply pipeline transformations
  if (pipeline) {
    for (const op of pipeline) {
      result = applyTransformation(result, op);
    }
  }

  // Apply output transformation
  return applyOutputTransform(result, output);
}

function applyTransformation(input: string, op: any): string {
  switch (op.op) {
    case "filter":
      const pred = op.predicate;
      const value = pred.valueFrom
        ? pred.valueFrom.selector
        : JSON.stringify(pred.value);
      return `${input}.filter(item => item.${pred.field} ${operatorToJS(pred.operator)} ${value})`;

    case "map":
      const fields = op.fields.map((f: any) => {
        if (typeof f === "string") return f;
        if (f.from && f.to) return `${f.to}: item.${f.from}`;
        if (f.compute) return generateComputedField(f);
        return "";
      }).filter(Boolean);
      return `${input}.map(item => ({ ${fields.join(", ")} }))`;

    case "sort":
      const dir = op.direction === "desc" ? -1 : 1;
      return `[...${input}].sort((a, b) => (a.${op.field} > b.${op.field} ? ${dir} : ${-dir}))`;

    case "slice":
      return `${input}.slice(${op.start ?? 0}${op.end ? `, ${op.end}` : ""})`;

    case "groupBy":
      return `Object.groupBy(${input}, item => item.${op.field})`;

    case "unique":
      if (op.field) {
        return `[...new Map(${input}.map(item => [item.${op.field}, item])).values()]`;
      }
      return `[...new Set(${input})]`;

    default:
      return input;
  }
}

function applyOutputTransform(input: string, output: any): string {
  switch (output.type) {
    case "array":
      return `return ${input};`;
    case "single":
      return `return ${input}[0] ?? null;`;
    case "aggregation":
      return `return ${applyAggregation(input, output.aggregation)};`;
    case "object":
      const fields = Object.entries(output.fields)
        .map(([key, agg]) => `${key}: ${applyAggregation(input, agg as any)}`)
        .join(",\n      ");
      return `return {\n      ${fields}\n    };`;
    default:
      return `return ${input};`;
  }
}

function applyAggregation(input: string, agg: any): string {
  switch (agg.type) {
    case "count":
      return `${input}.length`;
    case "sum":
      return `${input}.reduce((acc, item) => acc + (item.${agg.field} ?? 0), 0)`;
    case "avg":
      return `${input}.length > 0 ? ${input}.reduce((acc, item) => acc + (item.${agg.field} ?? 0), 0) / ${input}.length : 0`;
    case "min":
      return `Math.min(...${input}.map(item => item.${agg.field}))`;
    case "max":
      return `Math.max(...${input}.map(item => item.${agg.field}))`;
    case "first":
      return `${input}[0] ?? null`;
    case "last":
      return `${input}[${input}.length - 1] ?? null`;
    default:
      return input;
  }
}

function operatorToJS(op: string): string {
  const map: Record<string, string> = {
    eq: "===",
    neq: "!==",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    in: ".includes",
    contains: ".includes",
  };
  return map[op] || "===";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateComputedField(field: any): string {
  switch (field.compute) {
    case "concat":
      return `${field.name}: [${field.args.map((a: string) => `item.${a}`).join(", ")}].join(" ")`;
    case "sum":
      return `${field.name}: ${field.args.map((a: string) => `item.${a}`).join(" + ")}`;
    case "multiply":
      return `${field.name}: ${field.args.map((a: string) => `item.${a}`).join(" * ")}`;
    default:
      return `${field.name}: item.${field.args[0]}`;
  }
}
```

### 5. TanStack DB Code Generator

```typescript
// packages/codegen/src/tanstack-db-generator.ts

import { CollectionDefinition, LiveQuery, MutationDefinition, TableSchema } from "@json-render/core";

export function generateCollectionCode(
  collection: CollectionDefinition,
  tableSchema: TableSchema
): string {
  const { name, source, liveQueries } = collection;

  return `
import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { ${tableSchema.name}Schema, type ${tableSchema.name} } from "../schemas/${tableSchema.name}Schema";
import { queryClient } from "../queryClient";

${generateSourceConfig(name, source, tableSchema)}

${liveQueries?.map(q => generateLiveQueryExport(name, q)).join("\n\n") || ""}

// Export collection with queries namespace
export const ${name}Collection = Object.assign(collection, {
  queries: {
    ${liveQueries?.map(q => `${q.name}: ${q.name}Query`).join(",\n    ") || ""}
  }
});
`;
}

function generateSourceConfig(
  name: string,
  source: CollectionDefinition["source"],
  schema: TableSchema
): string {
  switch (source.type) {
    case "query":
      return `
const collection = createCollection<${schema.name}>(
  queryCollectionOptions({
    id: "${name}",
    queryKey: ${JSON.stringify(source.queryKey)},
    queryFn: async () => {
      const response = await fetch("${source.endpoint}");
      if (!response.ok) throw new Error("Failed to fetch ${name}");
      return response.json();
    },
    getKey: (item) => item.${schema.primaryKey || "id"},
    schema: ${schema.name}Schema,
    queryClient,
    ${source.refetchInterval ? `refetchInterval: ${source.refetchInterval},` : ""}
  })
);`;

    case "electric":
      return `
import { electricCollectionOptions } from "@tanstack/electric-db-collection";

const collection = createCollection<${schema.name}>(
  electricCollectionOptions({
    id: "${name}",
    table: "${source.table}",
    ${source.where ? `where: "${source.where}",` : ""}
    getKey: (item) => item.${schema.primaryKey || "id"},
    schema: ${schema.name}Schema,
  })
);`;

    case "localStorage":
      return `
import { localStorageCollectionOptions } from "@tanstack/db";

const collection = createCollection<${schema.name}>(
  localStorageCollectionOptions({
    id: "${name}",
    key: "${source.key}",
    getKey: (item) => item.${schema.primaryKey || "id"},
    schema: ${schema.name}Schema,
  })
);`;

    default:
      return `const collection = createCollection({ id: "${name}" });`;
  }
}

function generateLiveQueryExport(collectionName: string, query: LiveQuery): string {
  const { name, where, select, orderBy, limit } = query;

  let queryBuilder = `(q) => q.from({ items: collection })`;

  if (where && where.length > 0) {
    const conditions = where.map(w => {
      const value = w.valueFrom
        ? `/* dynamic: ${w.valueFrom.slice}.${w.valueFrom.selector} */`
        : JSON.stringify(w.value);
      return `.where(({ items }) => ${w.operator}(items.${w.field}, ${value}))`;
    }).join("\n    ");
    queryBuilder += `\n    ${conditions}`;
  }

  if (select && select.length > 0) {
    const fields = select.map(s =>
      typeof s === "string" ? `${s}: items.${s}` : `${s.as}: items.${s.field}`
    ).join(", ");
    queryBuilder += `\n    .select(({ items }) => ({ ${fields} }))`;
  }

  if (orderBy && orderBy.length > 0) {
    const sorts = orderBy.map(s => `items.${s.field}`).join(", ");
    queryBuilder += `\n    .orderBy(({ items }) => [${sorts}])`;
  }

  if (limit) {
    queryBuilder += `\n    .limit(${limit})`;
  }

  return `
// Live Query: ${query.description}
export const ${name}Query = ${queryBuilder};`;
}

export function generateMutationCode(mutation: MutationDefinition): string {
  const { name, collection, type, endpoint, method, optimistic } = mutation;

  return `
import { createOptimisticAction } from "@tanstack/db";
import { ${collection}Collection } from "../collections/${collection}Collection";

/**
 * ${mutation.description}
 */
export const ${name} = createOptimisticAction({
  ${optimistic ? `onMutate: (payload) => {
    ${generateOptimisticUpdate(type, collection)}
  },` : ""}
  mutationFn: async (payload) => {
    const response = await fetch("${endpoint}", {
      method: "${method}",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("${name} failed");
    const result = await response.json();
    ${optimistic ? `await ${collection}Collection.utils.refetch();` : ""}
    return result;
  },
});`;
}

function generateOptimisticUpdate(type: string, collection: string): string {
  switch (type) {
    case "insert":
      return `${collection}Collection.insert({ ...payload, id: crypto.randomUUID() });`;
    case "update":
      return `${collection}Collection.update(payload.id, (draft) => Object.assign(draft, payload));`;
    case "delete":
      return `${collection}Collection.delete(payload.id);`;
    default:
      return "// Custom mutation";
  }
}

export function generateDBSetupCode(collections: CollectionDefinition[]): string {
  return `
import { QueryClient } from "@tanstack/query-core";

// Global query client for TanStack DB
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Re-export all collections
${collections.map(c => `export { ${c.name}Collection } from "./collections/${c.name}Collection";`).join("\n")}
`;
}
```

### 6. RTK Slice Schema (packages/core)

Define a Zod schema for RTK slice definitions that AI can generate:

```typescript
// packages/core/src/slice-schema.ts

import { z } from "zod";

// Primitive types the AI can use for state
const StateValueSchema = z.union([
  z.literal("string"),
  z.literal("number"),
  z.literal("boolean"),
  z.literal("string[]"),
  z.literal("number[]"),
  z.object({ arrayOf: z.string() }), // Array of entity type
  z.object({ record: z.tuple([z.string(), z.string()]) }), // Record<K, V>
]);

// Single field in slice state
const StateFieldSchema = z.object({
  name: z.string(),
  type: StateValueSchema,
  default: z.unknown().optional(),
  description: z.string().optional(),
});

// Reducer action definition
const ReducerSchema = z.object({
  name: z.string(),
  description: z.string(),
  payload: z.object({
    type: StateValueSchema.optional(),
    fields: z.array(z.object({
      name: z.string(),
      type: StateValueSchema,
    })).optional(),
  }).optional(),
  // What state fields this reducer modifies
  modifies: z.array(z.string()),
});

// Async thunk definition
const ThunkSchema = z.object({
  name: z.string(),
  description: z.string(),
  // API endpoint or action description
  endpoint: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  // Payload type for the thunk
  payload: z.object({
    type: StateValueSchema.optional(),
    fields: z.array(z.object({
      name: z.string(),
      type: StateValueSchema,
    })).optional(),
  }).optional(),
  // State modifications on pending/fulfilled/rejected
  onPending: z.array(z.string()).optional(),
  onFulfilled: z.array(z.string()).optional(),
  onRejected: z.array(z.string()).optional(),
});

// Simple selector (direct path access)
const SimpleSelectorSchema = z.object({
  type: z.literal("simple").optional().default("simple"),
  name: z.string(),
  description: z.string(),
  // Path in slice state to select
  path: z.string(),
});

// Derived selector (computed from other selectors)
const DerivedSelectorSchema = z.object({
  type: z.literal("derived"),
  name: z.string(),
  description: z.string(),
  // Input selectors (from this slice or other slices)
  inputs: z.array(z.object({
    selector: z.string(), // Selector name
    slice: z.string().optional(), // If from another slice
  })),
  // Computation to perform
  computation: z.discriminatedUnion("op", [
    z.object({ op: z.literal("filter"), predicate: z.string() }), // JS predicate
    z.object({ op: z.literal("map"), mapper: z.string() }), // JS mapper
    z.object({ op: z.literal("find"), predicate: z.string() }),
    z.object({ op: z.literal("sort"), comparator: z.string() }),
    z.object({ op: z.literal("count") }),
    z.object({ op: z.literal("sum"), field: z.string() }),
    z.object({ op: z.literal("groupBy"), field: z.string() }),
    z.object({
      op: z.literal("combine"),
      combiner: z.string(), // JS function body
    }),
  ]),
});

// Parameterized selector (factory function)
const ParameterizedSelectorSchema = z.object({
  type: z.literal("parameterized"),
  name: z.string(),
  description: z.string(),
  // Parameters the selector accepts
  params: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean"]),
  })),
  // Base selector to filter/transform
  baseSelector: z.string(),
  // How to use params
  computation: z.object({
    op: z.enum(["filter", "find", "includes"]),
    expression: z.string(), // JS expression using params
  }),
});

// Union of all selector types
const SelectorSchema = z.discriminatedUnion("type", [
  SimpleSelectorSchema.extend({ type: z.literal("simple") }),
  DerivedSelectorSchema,
  ParameterizedSelectorSchema,
]).or(SimpleSelectorSchema); // Allow simple without type field

// Complete slice definition
export const SliceDefinitionSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/), // camelCase
  description: z.string(),
  initialState: z.array(StateFieldSchema),
  reducers: z.array(ReducerSchema).optional(),
  thunks: z.array(ThunkSchema).optional(),
  selectors: z.array(SelectorSchema).optional(),
});

export type SliceDefinition = z.infer<typeof SliceDefinitionSchema>;

// Collection of slices for a generation
export const SliceCollectionSchema = z.object({
  slices: z.array(SliceDefinitionSchema),
});

export type SliceCollection = z.infer<typeof SliceCollectionSchema>;
```

### 2. Slice Catalog (packages/core)

Similar to the component catalog, define what slices the AI can generate:

```typescript
// packages/core/src/slice-catalog.ts

import { z } from "zod";

export interface SliceCatalogEntry {
  description: string;
  // Suggested state shape
  suggestedState?: Record<string, string>;
  // Common patterns this slice supports
  patterns?: ("crud" | "pagination" | "loading" | "error" | "filter")[];
  // Example use cases
  examples?: string[];
}

export interface SliceCatalog {
  name: string;
  // Pre-defined slice templates AI can use
  templates: Record<string, SliceCatalogEntry>;
  // Custom state types the AI can reference
  entityTypes?: Record<string, z.ZodObject<any>>;
  // Common async patterns
  asyncPatterns?: {
    fetchList?: boolean;
    fetchById?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  };
}

export function createSliceCatalog(config: SliceCatalog): SliceCatalog {
  return config;
}

// Example catalog
export const dashboardSliceCatalog = createSliceCatalog({
  name: "dashboard",
  templates: {
    metrics: {
      description: "Stores dashboard metrics and KPIs",
      suggestedState: {
        revenue: "number",
        users: "number",
        orders: "number",
        loading: "boolean",
        error: "string | null",
      },
      patterns: ["loading", "error"],
    },
    filters: {
      description: "Manages filter state for data views",
      suggestedState: {
        dateRange: "{ start: string, end: string }",
        category: "string | null",
        searchTerm: "string",
      },
      patterns: ["filter"],
    },
    entities: {
      description: "Generic entity list with CRUD operations",
      patterns: ["crud", "pagination", "loading", "error"],
    },
  },
  entityTypes: {
    User: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.enum(["admin", "user", "guest"]),
    }),
    Product: z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      category: z.string(),
    }),
  },
});
```

### 3. Extended UIElement Props

Extend the UIElement type to support slice bindings:

```typescript
// packages/core/src/types.ts (additions)

// Binding to RTK slice state
interface SliceBinding {
  slice: string;      // Slice name
  selector: string;   // Selector name or path
}

// Binding to RTK action/thunk
interface ActionBinding {
  slice: string;      // Slice name
  action: string;     // Action or thunk name
  payload?: Record<string, DynamicValue<unknown>>; // Payload mapping
}

// Extended props for slice-aware components
interface SliceAwareProps {
  // Data can come from slice
  valuePath?: string | SliceBinding;
  // Actions can dispatch to slice
  onAction?: Action | ActionBinding;
  // Multiple bindings for complex components
  bindings?: Record<string, SliceBinding>;
}
```

### 4. Two-Phase Generation API

Create a new API endpoint that handles the two-phase generation:

```typescript
// apps/web/app/api/generate-with-slices/route.ts

import { streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export async function POST(request: Request) {
  const { prompt, catalog, sliceCatalog } = await request.json();

  // PHASE 1: Generate slices
  const sliceResult = await generateSlices(prompt, sliceCatalog);

  // PHASE 2: Generate UI with slice context
  const uiStream = await generateUIWithSlices(prompt, catalog, sliceResult.slices);

  // Return combined stream
  return new Response(
    combineStreams(sliceResult, uiStream),
    { headers: { "Content-Type": "text/event-stream" } }
  );
}

async function generateSlices(prompt: string, sliceCatalog: SliceCatalog) {
  const sliceSystemPrompt = buildSliceSystemPrompt(sliceCatalog);

  const result = await streamText({
    model: gateway(process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5"),
    system: sliceSystemPrompt,
    prompt: `Analyze this UI request and generate the necessary RTK slices:

${prompt}

Generate slice definitions as JSON. Consider:
- What data the UI will need
- What actions the user might take
- What async operations are needed
- How data flows through the application`,
    temperature: 0.5, // Lower temperature for more consistent structure
  });

  return result;
}

async function generateUIWithSlices(
  prompt: string,
  catalog: Catalog,
  slices: SliceDefinition[]
) {
  const uiSystemPrompt = buildUISystemPromptWithSlices(catalog, slices);

  return streamText({
    model: gateway(process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5"),
    system: uiSystemPrompt,
    prompt,
    temperature: 0.7,
  });
}

function buildSliceSystemPrompt(sliceCatalog: SliceCatalog): string {
  return `You are an expert at designing Redux Toolkit state management.

## Available Slice Templates
${Object.entries(sliceCatalog.templates).map(([name, entry]) => `
### ${name}
${entry.description}
Patterns: ${entry.patterns?.join(", ") || "none"}
`).join("\n")}

## Entity Types Available
${Object.entries(sliceCatalog.entityTypes || {}).map(([name, schema]) => `
### ${name}
${JSON.stringify(schema.shape, null, 2)}
`).join("\n")}

## Output Format
Generate a JSON object with this structure:
{
  "slices": [
    {
      "name": "sliceName",
      "description": "What this slice manages",
      "initialState": [
        { "name": "fieldName", "type": "string", "default": "" }
      ],
      "reducers": [...],
      "thunks": [...],
      "selectors": [...]
    }
  ]
}

Rules:
- Use camelCase for slice names
- Include loading/error state for async operations
- Generate selectors for all data the UI will need
- Keep slices focused and single-purpose
`;
}

function buildUISystemPromptWithSlices(
  catalog: Catalog,
  slices: SliceDefinition[]
): string {
  const basePrompt = buildUISystemPrompt(catalog);

  const sliceContext = `

## Available RTK Slices

The following slices have been generated for this application:

${slices.map(slice => `
### ${slice.name}Slice

**State:**
${slice.initialState.map(f => `- ${f.name}: ${f.type}`).join("\n")}

**Selectors:**
${slice.selectors?.map(s => `- ${s.name}: ${s.description}`).join("\n") || "None"}

**Actions:**
${slice.reducers?.map(r => `- ${r.name}: ${r.description}`).join("\n") || "None"}

**Async Thunks:**
${slice.thunks?.map(t => `- ${t.name}: ${t.description}`).join("\n") || "None"}
`).join("\n")}

## Binding Components to Slices

When a component needs data from a slice, use the slice binding format:

\`\`\`json
{
  "type": "Metric",
  "props": {
    "label": "Revenue",
    "valuePath": { "slice": "metrics", "selector": "selectRevenue" }
  }
}
\`\`\`

For actions that should dispatch to a slice:

\`\`\`json
{
  "type": "Button",
  "props": {
    "label": "Refresh",
    "onAction": { "slice": "metrics", "action": "fetchMetrics" }
  }
}
\`\`\`
`;

  return basePrompt + sliceContext;
}
```

### 5. Code Generator Updates (packages/codegen)

Extend the code generator to output RTK slices and wire them up:

```typescript
// packages/codegen/src/slice-generator.ts

import { SliceDefinition } from "@json-render/core";

export function generateSliceCode(slice: SliceDefinition): string {
  const { name, initialState, reducers, thunks, selectors } = slice;
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);

  return `
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

// Types
interface ${capitalName}State {
${initialState.map(f => `  ${f.name}: ${mapTypeToTS(f.type)};`).join("\n")}
}

// Initial State
const initialState: ${capitalName}State = {
${initialState.map(f => `  ${f.name}: ${JSON.stringify(f.default ?? getDefaultForType(f.type))},`).join("\n")}
};

${thunks?.map(thunk => `
// Async Thunk: ${thunk.name}
export const ${thunk.name} = createAsyncThunk(
  "${name}/${thunk.name}",
  async (${thunk.payload ? `payload: ${mapPayloadToTS(thunk.payload)}` : "_"}, { rejectWithValue }) => {
    try {
      const response = await fetch("${thunk.endpoint || "/api/" + thunk.name}", {
        method: "${thunk.method || "GET"}",
        ${thunk.payload ? 'body: JSON.stringify(payload),' : ''}
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Request failed");
      return response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);
`).join("\n") || ""}

// Slice
export const ${name}Slice = createSlice({
  name: "${name}",
  initialState,
  reducers: {
${reducers?.map(reducer => `
    ${reducer.name}: (state, action: PayloadAction<${mapPayloadToTS(reducer.payload)}>) => {
      // TODO: Implement ${reducer.description}
      ${reducer.modifies.map(field => `// state.${field} = ...`).join("\n      ")}
    },
`).join("") || ""}
  },
  extraReducers: (builder) => {
${thunks?.map(thunk => `
    builder
      .addCase(${thunk.name}.pending, (state) => {
        ${thunk.onPending?.map(f => `state.${f} = ${getLoadingValue(f)};`).join("\n        ") || "// pending"}
      })
      .addCase(${thunk.name}.fulfilled, (state, action) => {
        ${thunk.onFulfilled?.map(f => `state.${f} = action.payload.${f} ?? state.${f};`).join("\n        ") || "// fulfilled"}
      })
      .addCase(${thunk.name}.rejected, (state, action) => {
        ${thunk.onRejected?.map(f => `state.${f} = action.payload as string;`).join("\n        ") || "// rejected"}
      });
`).join("") || ""}
  },
});

// Actions
export const { ${reducers?.map(r => r.name).join(", ") || ""} } = ${name}Slice.actions;

// Selectors
${selectors?.map(selector => generateSelectorFromDefinition(name, selector)).join("\n") || ""}

export default ${name}Slice.reducer;
`;
}

export function generateStoreCode(slices: SliceDefinition[]): string {
  return `
import { configureStore } from "@reduxjs/toolkit";
${slices.map(s => `import ${s.name}Reducer from "./slices/${s.name}Slice";`).join("\n")}

export const store = configureStore({
  reducer: {
${slices.map(s => `    ${s.name}: ${s.name}Reducer,`).join("\n")}
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
}

export function generateHooksCode(): string {
  return `
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
}

// Helper functions
function mapTypeToTS(type: unknown): string {
  if (typeof type === "string") {
    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      "string[]": "string[]",
      "number[]": "number[]",
    };
    return typeMap[type] || "unknown";
  }
  if (typeof type === "object" && type !== null) {
    if ("arrayOf" in type) return `${(type as any).arrayOf}[]`;
    if ("record" in type) {
      const [k, v] = (type as any).record;
      return `Record<${k}, ${v}>`;
    }
  }
  return "unknown";
}

function getDefaultForType(type: unknown): unknown {
  if (type === "string") return "";
  if (type === "number") return 0;
  if (type === "boolean") return false;
  if (type === "string[]" || type === "number[]") return [];
  return null;
}

function mapPayloadToTS(payload: unknown): string {
  if (!payload) return "void";
  // Implement based on payload schema
  return "unknown";
}

function getLoadingValue(field: string): string {
  if (field === "loading") return "true";
  if (field === "error") return "null";
  return "/* set loading state */";
}

function generateSelectorFromDefinition(sliceName: string, selector: any): string {
  // Handle simple selectors (or those without explicit type)
  if (!selector.type || selector.type === "simple") {
    return `
// ${selector.description}
export const ${selector.name} = (state: RootState) => state.${sliceName}.${selector.path};`;
  }

  // Handle derived selectors
  if (selector.type === "derived") {
    const inputSelectors = selector.inputs.map((i: any) => {
      if (i.slice && i.slice !== sliceName) {
        return `select${capitalize(i.slice)}${capitalize(i.selector.replace("select", ""))}`;
      }
      return i.selector;
    });

    const computation = generateComputation(selector.computation);

    return `
// ${selector.description}
export const ${selector.name} = createSelector(
  [${inputSelectors.join(", ")}],
  (${selector.inputs.map((_: any, i: number) => `input${i}`).join(", ")}) => {
    ${computation}
  }
);`;
  }

  // Handle parameterized selectors
  if (selector.type === "parameterized") {
    const params = selector.params.map((p: any) => `${p.name}: ${p.type}`).join(", ");
    const computation = generateParameterizedComputation(selector);

    return `
// ${selector.description}
export const ${selector.name} = (${params}) => createSelector(
  [${selector.baseSelector}],
  (items) => {
    ${computation}
  }
);`;
  }

  return "";
}

function generateComputation(computation: any): string {
  switch (computation.op) {
    case "filter":
      return `return input0.filter(${computation.predicate});`;
    case "map":
      return `return input0.map(${computation.mapper});`;
    case "find":
      return `return input0.find(${computation.predicate}) ?? null;`;
    case "sort":
      return `return [...input0].sort(${computation.comparator});`;
    case "count":
      return `return input0.length;`;
    case "sum":
      return `return input0.reduce((acc, item) => acc + (item.${computation.field} ?? 0), 0);`;
    case "groupBy":
      return `return Object.groupBy(input0, item => item.${computation.field});`;
    case "combine":
      return `return (${computation.combiner})(${Array.from({ length: 10 }, (_, i) => `input${i}`).join(", ")});`;
    default:
      return `return input0;`;
  }
}

function generateParameterizedComputation(selector: any): string {
  const { computation, params } = selector;
  const paramNames = params.map((p: any) => p.name);

  switch (computation.op) {
    case "filter":
      return `return items.filter(item => ${computation.expression});`;
    case "find":
      return `return items.find(item => ${computation.expression}) ?? null;`;
    case "includes":
      return `return items.some(item => ${computation.expression});`;
    default:
      return `return items;`;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### 6. Updated Generator Integration

```typescript
// examples/dashboard/lib/codegen/generator.ts (additions)

import { generateSliceCode, generateStoreCode, generateHooksCode } from "./slice-generator";

export interface GenerateProjectOptions {
  tree: UITree;
  slices?: SliceDefinition[];
  // ... existing options
}

export function generateProject(options: GenerateProjectOptions): GeneratedProject {
  const { tree, slices = [] } = options;

  const files: Record<string, string> = {};

  // Generate existing files...
  files["app/page.tsx"] = generatePageWithSlices(tree, slices);
  files["app/layout.tsx"] = generateLayoutWithProvider(slices);

  // Generate RTK store if slices exist
  if (slices.length > 0) {
    files["store/index.ts"] = generateStoreCode(slices);
    files["store/hooks.ts"] = generateHooksCode();

    for (const slice of slices) {
      files[`store/slices/${slice.name}Slice.ts`] = generateSliceCode(slice);
    }

    // Update package.json with RTK dependencies
    files["package.json"] = generatePackageJsonWithRTK();
  }

  return { files };
}

function generateLayoutWithProvider(slices: SliceDefinition[]): string {
  if (slices.length === 0) {
    return existingLayoutTemplate;
  }

  return `
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
`;
}

function generateProvidersFile(): string {
  return `
"use client";

import { Provider } from "react-redux";
import { store } from "../store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
`;
}
```

---

## Implementation Phases

### Phase 1: Table Schema System
- [ ] Create `table-schema.ts` with Zod schemas for entity definitions
- [ ] Create table schema catalog for AI-guided generation
- [ ] Implement `tableToZodSchema()` code generator
- [ ] Add validation for relationships and indexes
- [ ] Create `/api/generate-schema` endpoint

### Phase 2: TanStack DB Integration
- [ ] Create `collection-schema.ts` with collection/query definitions
- [ ] Implement `generateCollectionCode()` function
- [ ] Implement `generateLiveQueryExport()` function
- [ ] Create `generateMutationCode()` for optimistic updates
- [ ] Add TanStack DB provider wrapper generation
- [ ] Create `/api/generate-collections` endpoint

### Phase 3: RTK Slice System
- [ ] Create `slice-schema.ts` with enhanced selector support
- [ ] Implement simple, derived, and parameterized selectors
- [ ] Create `generateSliceCode()` with full selector generation
- [ ] Implement `generateStoreCode()` function
- [ ] Add Redux Provider wrapper generation
- [ ] Create `/api/generate-slices` endpoint

### Phase 4: Unified Selector System
- [ ] Create `selector-schema.ts` for cross-source selectors
- [ ] Implement selector composition (TanStack DB + RTK)
- [ ] Generate `createSelector` memoized selectors
- [ ] Generate React hooks for mixed data sources
- [ ] Add selector dependency resolution

### Phase 5: Multi-Phase Generation API
- [ ] Create `/api/generate-full` combined endpoint
- [ ] Implement 5-phase generation pipeline:
  1. Table schemas
  2. TanStack DB collections
  3. RTK slices (local state)
  4. Cross-source selectors
  5. UI with bindings
- [ ] Update `useUIStream` hook for multi-phase flow
- [ ] Add progress tracking for each phase

### Phase 6: Component Binding & Autowiring
- [ ] Extend UIElement types for multi-source bindings:
  - `{ collection: "users", query: "active" }` - TanStack DB
  - `{ slice: "ui", path: "theme" }` - RTK slice
  - `{ selector: "selectFilteredUsers" }` - Composed selector
- [ ] Generate typed hook usage in components
- [ ] Handle loading/error states from both sources
- [ ] Implement action dispatch for mutations

### Phase 7: Testing & Documentation
- [ ] Add integration tests for full flow
- [ ] Update playground with schema/collection/slice generation
- [ ] Create example dashboard with full state management
- [ ] Document new APIs, patterns, and best practices
- [ ] Add migration guide from Context-only apps

---

## Example Output

### 1. Generated Table Schema

```typescript
// db/schemas/UserSchema.ts
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
  departmentId: z.string().uuid(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
```

### 2. Generated TanStack DB Collection

```typescript
// db/collections/usersCollection.ts
import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { UserSchema, type User } from "../schemas/UserSchema";
import { queryClient } from "../queryClient";

const collection = createCollection<User>(
  queryCollectionOptions({
    id: "users",
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    getKey: (item) => item.id,
    schema: UserSchema,
    queryClient,
  })
);

// Live Query: Get all active users
export const activeUsersQuery = (q) => q
  .from({ users: collection })
  .where(({ users }) => eq(users.active, true))
  .select(({ users }) => ({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }));

// Live Query: Get users by department (parameterized)
export const usersByDepartmentQuery = (departmentId: string) => (q) => q
  .from({ users: collection })
  .where(({ users }) => eq(users.departmentId, departmentId))
  .orderBy(({ users }) => [users.name]);

// Export collection with queries namespace
export const usersCollection = Object.assign(collection, {
  queries: {
    active: activeUsersQuery,
    byDepartment: usersByDepartmentQuery,
  }
});
```

### 3. Generated RTK Slice (Local UI State)

```typescript
// store/slices/filtersSlice.ts
import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

interface FiltersState {
  searchTerm: string;
  selectedDepartment: string | null;
  selectedRoles: string[];
  sortField: "name" | "email" | "createdAt";
  sortDirection: "asc" | "desc";
}

const initialState: FiltersState = {
  searchTerm: "",
  selectedDepartment: null,
  selectedRoles: [],
  sortField: "name",
  sortDirection: "asc",
};

export const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSelectedDepartment: (state, action: PayloadAction<string | null>) => {
      state.selectedDepartment = action.payload;
    },
    toggleRole: (state, action: PayloadAction<string>) => {
      const role = action.payload;
      const index = state.selectedRoles.indexOf(role);
      if (index === -1) {
        state.selectedRoles.push(role);
      } else {
        state.selectedRoles.splice(index, 1);
      }
    },
    setSorting: (state, action: PayloadAction<{ field: FiltersState["sortField"]; direction: FiltersState["sortDirection"] }>) => {
      state.sortField = action.payload.field;
      state.sortDirection = action.payload.direction;
    },
    resetFilters: () => initialState,
  },
});

export const {
  setSearchTerm,
  setSelectedDepartment,
  toggleRole,
  setSorting,
  resetFilters,
} = filtersSlice.actions;

// Simple selectors
export const selectSearchTerm = (state: RootState) => state.filters.searchTerm;
export const selectSelectedDepartment = (state: RootState) => state.filters.selectedDepartment;
export const selectSelectedRoles = (state: RootState) => state.filters.selectedRoles;
export const selectSortField = (state: RootState) => state.filters.sortField;
export const selectSortDirection = (state: RootState) => state.filters.sortDirection;

// Derived selector: Check if any filters are active
export const selectHasActiveFilters = createSelector(
  [selectSearchTerm, selectSelectedDepartment, selectSelectedRoles],
  (searchTerm, department, roles) => {
    return searchTerm.length > 0 || department !== null || roles.length > 0;
  }
);

// Parameterized selector: Check if a specific role is selected
export const selectIsRoleSelected = (role: string) => createSelector(
  [selectSelectedRoles],
  (roles) => roles.includes(role)
);

export default filtersSlice.reducer;
```

### 4. Generated Cross-Source Selector

```typescript
// selectors/usersSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { usersCollection } from "../db/collections/usersCollection";
import {
  selectSearchTerm,
  selectSelectedDepartment,
  selectSelectedRoles,
  selectSortField,
  selectSortDirection,
} from "../store/slices/filtersSlice";

/**
 * Hook: Get filtered and sorted users
 * Combines server data (TanStack DB) with local filter state (RTK)
 */
export function useFilteredUsers() {
  // Get filter state from RTK
  const searchTerm = useAppSelector(selectSearchTerm);
  const selectedDepartment = useAppSelector(selectSelectedDepartment);
  const selectedRoles = useAppSelector(selectSelectedRoles);
  const sortField = useAppSelector(selectSortField);
  const sortDirection = useAppSelector(selectSortDirection);

  // Get users from TanStack DB
  const { data: users, isLoading } = useLiveQuery((q) =>
    q.from({ users: usersCollection })
  );

  // Compute filtered and sorted result
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let result = [...users];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }

    // Apply department filter
    if (selectedDepartment) {
      result = result.filter((user) => user.departmentId === selectedDepartment);
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      result = result.filter((user) => selectedRoles.includes(user.role));
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, searchTerm, selectedDepartment, selectedRoles, sortField, sortDirection]);

  return { users: filteredUsers, isLoading };
}

/**
 * Hook: Get user counts by role (derived aggregation)
 */
export function useUserCountsByRole() {
  const { data: users } = useLiveQuery((q) =>
    q.from({ users: usersCollection })
  );

  return useMemo(() => {
    if (!users) return { admin: 0, user: 0, guest: 0 };

    return users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      { admin: 0, user: 0, guest: 0 } as Record<string, number>
    );
  }, [users]);
}

/**
 * Selector: Get unique departments from users
 */
export function useUniqueDepartments() {
  const { data: users } = useLiveQuery((q) =>
    q.from({ users: usersCollection })
      .select(({ users }) => ({ departmentId: users.departmentId }))
  );

  return useMemo(() => {
    if (!users) return [];
    return [...new Set(users.map((u) => u.departmentId))];
  }, [users]);
}
```

### 5. Generated Component Using All Layers

```tsx
// components/UserTable.tsx
"use client";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setSearchTerm,
  setSelectedDepartment,
  toggleRole,
  setSorting,
  resetFilters,
  selectSearchTerm,
  selectSelectedDepartment,
  selectHasActiveFilters,
  selectIsRoleSelected,
} from "../store/slices/filtersSlice";
import { useFilteredUsers, useUserCountsByRole, useUniqueDepartments } from "../selectors/usersSelectors";
import { updateUser } from "../db/mutations/userMutations";

export function UserTable() {
  const dispatch = useAppDispatch();

  // Local UI state from RTK
  const searchTerm = useAppSelector(selectSearchTerm);
  const selectedDepartment = useAppSelector(selectSelectedDepartment);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);

  // Derived data from cross-source selectors
  const { users, isLoading } = useFilteredUsers();
  const roleCounts = useUserCountsByRole();
  const departments = useUniqueDepartments();

  // Handle optimistic mutation
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    await updateUser({ id: userId, active: !currentActive });
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className="px-3 py-2 border rounded"
        />

        <select
          value={selectedDepartment ?? ""}
          onChange={(e) => dispatch(setSelectedDepartment(e.target.value || null))}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        {/* Role filters with counts */}
        <div className="flex gap-2">
          {(["admin", "user", "guest"] as const).map((role) => (
            <button
              key={role}
              onClick={() => dispatch(toggleRole(role))}
              className={`px-3 py-1 rounded ${
                useAppSelector(selectIsRoleSelected(role))
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              {role} ({roleCounts[role]})
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => dispatch(resetFilters())}
            className="text-sm text-blue-500 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600">
        Showing {users.length} users
      </p>

      {/* User Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="p-2">{user.name}</td>
              <td className="p-2">{user.email}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  user.role === "admin" ? "bg-purple-100" :
                  user.role === "user" ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleToggleActive(user.id, user.active)}
                  className={`w-12 h-6 rounded-full transition ${
                    user.active ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition transform ${
                    user.active ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Open Questions

1. **TanStack DB Backend Selection**
   - Which collection types to support initially?
   - QueryCollection (REST APIs) - simplest, most universal
   - ElectricCollection (Postgres sync) - better for real-time
   - Should we generate backend API routes too?

2. **Selector Composition Complexity**
   - How deep should selector composition go?
   - Should we limit to 2-3 levels to avoid complexity?
   - How to handle circular dependencies?

3. **Optimistic Update Strategy**
   - Should all mutations be optimistic by default?
   - How to handle rollback UI feedback?
   - Should we generate error boundary components?

4. **Code Organization**
   - Flat vs nested folder structure for generated code?
   - Single file vs split files for large slices?
   - How to handle schema/collection/slice naming collisions?

5. **Type Safety Across Boundaries**
   - How to ensure TanStack DB types flow to selectors?
   - Should we generate a single types.ts barrel export?
   - How to handle optional/nullable fields across layers?

6. **Live Query Reactivity**
   - How to handle dependent live queries efficiently?
   - Should we batch updates to prevent cascading re-renders?
   - Memory management for many active live queries?

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "@tanstack/react-db": "^0.5.0",
    "@tanstack/query-core": "^5.0.0",
    "@tanstack/query-db-collection": "^0.5.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@types/react-redux": "^7.1.33"
  },
  "optionalDependencies": {
    "@tanstack/electric-db-collection": "^0.5.0",
    "electric-sql": "^0.12.0"
  }
}
```

---

## Success Metrics

1. **Schema Generation Quality**: AI generates valid table schemas 95%+ of the time
2. **Collection Accuracy**: Generated TanStack DB collections connect to APIs correctly
3. **Selector Correctness**: Derived selectors compute expected values
4. **Type Safety**: Generated code passes TypeScript strict mode
5. **Runtime Performance**: Live queries update in <16ms for smooth 60fps
6. **Optimistic UX**: Mutations feel instant with proper rollback on error
7. **Code Compilation**: Generated full-stack app compiles without errors
8. **Bundle Size**: RTK + TanStack DB adds <50KB gzipped

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    React Components                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │    │
│  │  │  Table    │  │   Form    │  │  Metrics  │  │  Filters  │    │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │    │
│  └────────┼──────────────┼──────────────┼──────────────┼──────────┘    │
│           │              │              │              │                 │
│           ▼              ▼              ▼              ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SELECTOR LAYER                                │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ Composed Selectors (useFilteredUsers, useUserStats...)  │    │    │
│  │  │ • Combine server + local data                           │    │    │
│  │  │ • Memoized with createSelector / useMemo                │    │    │
│  │  │ • Type-safe derived state                               │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│           ┌─────────────────┴─────────────────┐                         │
│           ▼                                   ▼                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐             │
│  │     SERVER DATA         │    │     LOCAL UI STATE      │             │
│  │     (TanStack DB)       │    │     (RTK Slices)        │             │
│  ├─────────────────────────┤    ├─────────────────────────┤             │
│  │ Collections:            │    │ Slices:                 │             │
│  │ • usersCollection       │    │ • filtersSlice          │             │
│  │ • ordersCollection      │    │ • uiSlice               │             │
│  │ • productsCollection    │    │ • preferencesSlice      │             │
│  │                         │    │                         │             │
│  │ Live Queries:           │    │ Selectors:              │             │
│  │ • activeUsersQuery      │    │ • selectSearchTerm      │             │
│  │ • recentOrdersQuery     │    │ • selectTheme           │             │
│  │ • lowStockQuery         │    │ • selectIsRoleSelected  │             │
│  │                         │    │                         │             │
│  │ Mutations:              │    │ Actions:                │             │
│  │ • createUser            │    │ • setSearchTerm         │             │
│  │ • updateOrder           │    │ • toggleSidebar         │             │
│  │ • deleteProduct         │    │ • resetFilters          │             │
│  └───────────┬─────────────┘    └─────────────────────────┘             │
│              │                                                           │
│              ▼                                                           │
│  ┌─────────────────────────┐                                            │
│  │     TABLE SCHEMAS       │                                            │
│  │     (Zod Definitions)   │                                            │
│  ├─────────────────────────┤                                            │
│  │ • UserSchema            │                                            │
│  │ • OrderSchema           │                                            │
│  │ • ProductSchema         │                                            │
│  └───────────┬─────────────┘                                            │
│              │                                                           │
│              ▼                                                           │
│  ┌─────────────────────────┐                                            │
│  │     BACKEND APIs        │                                            │
│  │  (REST / GraphQL / WS)  │                                            │
│  └─────────────────────────┘                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure (Generated Output)

```
generated-app/
├── app/
│   ├── layout.tsx           # Providers wrapper
│   ├── page.tsx             # Main UI
│   └── providers.tsx        # Redux + TanStack Query providers
│
├── db/
│   ├── queryClient.ts       # TanStack Query client config
│   ├── schemas/
│   │   ├── UserSchema.ts    # Zod schema + types
│   │   ├── OrderSchema.ts
│   │   └── index.ts         # Barrel export
│   ├── collections/
│   │   ├── usersCollection.ts    # Collection + live queries
│   │   ├── ordersCollection.ts
│   │   └── index.ts
│   └── mutations/
│       ├── userMutations.ts      # Optimistic mutations
│       ├── orderMutations.ts
│       └── index.ts
│
├── store/
│   ├── index.ts             # configureStore
│   ├── hooks.ts             # useAppSelector, useAppDispatch
│   └── slices/
│       ├── filtersSlice.ts  # Local state + selectors
│       ├── uiSlice.ts
│       └── index.ts
│
├── selectors/
│   ├── usersSelectors.ts    # Cross-source composed selectors
│   ├── ordersSelectors.ts
│   └── index.ts
│
├── components/
│   └── ui/                  # Generated UI components
│       ├── UserTable.tsx
│       ├── OrderList.tsx
│       └── index.ts
│
└── package.json             # With all dependencies
