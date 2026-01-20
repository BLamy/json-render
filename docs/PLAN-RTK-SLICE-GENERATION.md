# Plan: AI Generation of RTK Slices with JSON Autowiring

## Executive Summary

This document outlines a plan to extend `json-render` with the ability to:
1. **Generate RTK slices via AI** before generating the UI JSON tree
2. **Autowire those slices** into the generated JSON and code output

This enables more sophisticated state management in generated applications while maintaining the safety guarantees of the catalog-based approach.

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

### New Flow with RTK Slices

```
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 1: RTK Generation                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Prompt → AI → RTK Slice Definitions (JSON Schema)        │
│                              ↓                                   │
│                    Validate against Slice Catalog                │
│                              ↓                                   │
│                    Store in Generation Context                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 2: UI Generation                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI receives: User Prompt + Available Slices                    │
│                              ↓                                   │
│              AI → JSON (UITree) with slice bindings              │
│                              ↓                                   │
│         Components bind to: /slices/{sliceName}/{path}          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 3: Code Generation                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   UITree + Slice Definitions → codegen                          │
│                              ↓                                   │
│   Output:                                                        │
│   - store/index.ts (configureStore)                             │
│   - store/slices/{sliceName}Slice.ts                            │
│   - store/hooks.ts (typed useSelector/useDispatch)              │
│   - components wired to use selectors                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. RTK Slice Schema (packages/core)

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

// Selector definition
const SelectorSchema = z.object({
  name: z.string(),
  description: z.string(),
  // Path in slice state to select
  path: z.string(),
  // Optional transformation
  transform: z.enum(["identity", "length", "sum", "first", "last"]).optional(),
});

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
${selectors?.map(selector => `
export const ${selector.name} = (state: RootState) => state.${name}.${selector.path};
`).join("") || ""}

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

### Phase 1: Core Schema & Types (Week 1)
- [ ] Create `slice-schema.ts` with Zod schemas
- [ ] Create `slice-catalog.ts` with catalog types
- [ ] Extend `types.ts` with slice binding types
- [ ] Add unit tests for schema validation

### Phase 2: Slice Generation API (Week 2)
- [ ] Create `/api/generate-slices` endpoint
- [ ] Build slice system prompt generator
- [ ] Implement slice JSON parsing and validation
- [ ] Add streaming support for slice generation

### Phase 3: Two-Phase Generation (Week 3)
- [ ] Create `/api/generate-with-slices` combined endpoint
- [ ] Implement slice context injection into UI prompt
- [ ] Update `useUIStream` hook for two-phase flow
- [ ] Add slice metadata to generation response

### Phase 4: Code Generator Updates (Week 4)
- [ ] Create `slice-generator.ts` module
- [ ] Implement `generateSliceCode()` function
- [ ] Implement `generateStoreCode()` function
- [ ] Update `generateProject()` to include slices
- [ ] Add Redux Provider wrapper generation

### Phase 5: Component Binding (Week 5)
- [ ] Update component templates to support slice bindings
- [ ] Generate typed selector usage in components
- [ ] Generate dispatch calls for actions
- [ ] Handle async thunk state in components

### Phase 6: Testing & Documentation (Week 6)
- [ ] Add integration tests for full flow
- [ ] Update playground with slice generation option
- [ ] Create example dashboard with RTK slices
- [ ] Document new API and patterns

---

## Example Output

### Generated Slice

```typescript
// store/slices/metricsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface MetricsState {
  revenue: number;
  users: number;
  orders: number;
  loading: boolean;
  error: string | null;
}

const initialState: MetricsState = {
  revenue: 0,
  users: 0,
  orders: 0,
  loading: false,
  error: null,
};

export const fetchMetrics = createAsyncThunk(
  "metrics/fetchMetrics",
  async () => {
    const response = await fetch("/api/metrics");
    return response.json();
  }
);

export const metricsSlice = createSlice({
  name: "metrics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.revenue = action.payload.revenue;
        state.users = action.payload.users;
        state.orders = action.payload.orders;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch metrics";
      });
  },
});

export const selectRevenue = (state: RootState) => state.metrics.revenue;
export const selectUsers = (state: RootState) => state.metrics.users;
export const selectLoading = (state: RootState) => state.metrics.loading;

export default metricsSlice.reducer;
```

### Generated Component Using Slice

```tsx
// components/MetricsCard.tsx
"use client";

import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectRevenue, selectLoading, fetchMetrics } from "../store/slices/metricsSlice";
import { useEffect } from "react";

export function MetricsCard() {
  const dispatch = useAppDispatch();
  const revenue = useAppSelector(selectRevenue);
  const loading = useAppSelector(selectLoading);

  useEffect(() => {
    dispatch(fetchMetrics());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h3>Revenue</h3>
      <p className="text-2xl font-bold">${revenue.toLocaleString()}</p>
    </div>
  );
}
```

---

## Open Questions

1. **Should slices be generated as separate files or inline?**
   - Separate files are cleaner but require more file management
   - Inline (single store file) is simpler for small apps

2. **How to handle slice dependencies?**
   - If one slice needs data from another, how to model this?
   - Consider using RTK Query for data fetching instead of thunks

3. **Should we support RTK Query as an alternative?**
   - RTK Query is better for data fetching patterns
   - Could be a future enhancement

4. **How to validate slice-to-component bindings?**
   - Need to ensure components reference existing selectors
   - Consider generating TypeScript types for validation

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0"
  },
  "devDependencies": {
    "@types/react-redux": "^7.1.33"
  }
}
```

---

## Success Metrics

1. **Generation Quality**: AI generates valid slice definitions 95%+ of the time
2. **Binding Accuracy**: Components correctly reference generated selectors
3. **Code Compilation**: Generated code compiles without errors
4. **Runtime Correctness**: Generated apps function correctly with state management
