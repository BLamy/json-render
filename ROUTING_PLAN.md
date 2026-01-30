# JSON-Render Routes & Layouts Plan

## Overview

Add a route-based layout system to json-render inspired by Remix's nested routing pattern. When generating an app, the AI will:

1. Define routes where each path segment maps to a layout
2. Each layout has named outlets with descriptions
3. Outlets are filled in parallel using json-render's existing streaming generation
4. The result is an interactive visualization (like Remix's Fakebooks demo) where users can hover over sections to see the route/outlet structure

---

## Core Concepts

### 1. URL State Management (nuqs-style)

All URL state (path params, search params, hash) is exposed through the DataProvider under a reserved `$route` namespace. This follows nuqs patterns for type-safe, serializable URL state.

#### Data Model Structure

```typescript
// The DataProvider automatically injects route state at $route
interface RouteState {
  // Path parameters (from dynamic segments like /invoices/:id)
  params: Record<string, string>;

  // Search/query parameters (nuqs-style typed access)
  searchParams: Record<string, unknown>;

  // Current path info
  pathname: string;
  hash: string;

  // Computed/derived route info
  segments: string[];           // ["sales", "invoices", "123"]
  matchedRoutes: string[];      // ["/", "/sales", "/sales/invoices", "/sales/invoices/:id"]
}

// Example: URL = /sales/invoices/123?tab=details&page=2#notes
// DataProvider automatically provides:
{
  "$route": {
    "params": { "id": "123" },
    "searchParams": { "tab": "details", "page": 2 },
    "pathname": "/sales/invoices/123",
    "hash": "notes",
    "segments": ["sales", "invoices", "123"],
    "matchedRoutes": ["/", "/sales", "/sales/invoices", "/sales/invoices/:id"]
  },
  // ... rest of app data
}
```

#### Accessing Route State in Components

Components can bind to route state using standard json-render data binding:

```typescript
// In UITree element definition
{
  key: "invoice-tabs",
  type: "Tabs",
  props: {
    // Bind to search param
    value: { path: "/$route/searchParams/tab" },
    defaultValue: "overview",
    onValueChange: {
      action: "setSearchParam",
      params: { key: "tab", value: { path: "/event/value" } }
    }
  }
}

// List pagination
{
  key: "pagination",
  type: "Pagination",
  props: {
    currentPage: { path: "/$route/searchParams/page" },
    onPageChange: {
      action: "setSearchParam",
      params: { key: "page", value: { path: "/event/value" } }
    }
  }
}

// Using path params
{
  key: "invoice-detail",
  type: "InvoiceCard",
  props: {
    invoiceId: { path: "/$route/params/id" }
  }
}
```

### 2. Search Params Schema (nuqs-style)

Define typed search params per route with parsers, defaults, and validation:

```typescript
interface SearchParamDefinition<T = unknown> {
  // Parser type (built-in or custom)
  type: SearchParamType;

  // Default value when param is missing
  default?: T;

  // Description for AI generation
  description: string;

  // History mode: push adds to history, replace doesn't
  history?: "push" | "replace";

  // Shallow mode: don't trigger server re-render
  shallow?: boolean;

  // Validation (optional Zod schema or constraints)
  validate?: ValidationConfig;

  // Transform before setting (e.g., clamp to range)
  transform?: string;  // Function name from catalog
}

// Built-in parser types (matching nuqs)
type SearchParamType =
  | "string"           // Default, no transformation
  | "integer"          // parseInt with fallback
  | "float"            // parseFloat with fallback
  | "boolean"          // "true"/"false" or "1"/"0"
  | "timestamp"        // Date as Unix timestamp
  | "isoDateTime"      // Date as ISO string
  | "json"             // JSON.parse/stringify
  | "stringEnum"       // Literal union type
  | "integerEnum"      // Numeric enum
  | "array"            // Comma-separated values
  | "delimitedArray"   // Custom delimiter
  | { custom: string } // Custom parser from catalog

// Example route with search params
interface RouteDefinition {
  path: string;
  layout: string;
  outlets: Record<string, OutletConfig>;

  // NEW: Type-safe search params definition
  searchParams?: Record<string, SearchParamDefinition>;

  // Existing
  loader?: DataLoaderConfig;
  children?: RouteDefinition[];
}
```

### 3. Route Definition

Routes define the URL structure and which layouts to use at each segment:

```typescript
interface RouteDefinition {
  path: string;                    // e.g., "/sales/invoices/:id"
  layout: string;                  // Layout template to use
  outlets: Record<string, OutletConfig>;  // Named outlets in this layout
  loader?: DataLoaderConfig;       // Data requirements for this route
  children?: RouteDefinition[];    // Nested routes
}

interface OutletConfig {
  description: string;             // AI prompt for generating this outlet
  constraints?: string[];          // Component/style constraints
  dataPath?: string;               // Data context path for this outlet
  priority?: number;               // Generation order (for dependencies)
}

interface DataLoaderConfig {
  endpoint?: string;               // API endpoint to fetch
  mockData?: unknown;              // Mock data for visualization
  params?: string[];               // URL params to extract
}

// Search param definition for typed URL state
interface SearchParamDefinition<T = unknown> {
  type: SearchParamType;
  default?: T;
  description: string;
  history?: "push" | "replace";
  shallow?: boolean;
}
```

### 2. Layout Templates

Layouts are predefined templates with named outlet slots, modeled after shadcn blocks:

```typescript
interface LayoutTemplate {
  name: string;                    // e.g., "sidebar-dashboard"
  description: string;             // When to use this layout
  outlets: Record<string, OutletDefinition>;
  defaultStyles?: Record<string, string>;
}

interface OutletDefinition {
  name: string;                    // e.g., "sidebar", "main", "header"
  description: string;             // What should go here
  position: OutletPosition;        // CSS grid/flex positioning
  constraints: {
    minWidth?: string;
    maxWidth?: string;
    allowedComponents?: string[];  // Restrict which components can render here
    suggestedComponents?: string[];// Hint to AI what works well here
  };
  renderHints: string;             // AI instructions for best results
}

interface OutletPosition {
  gridArea?: string;               // CSS grid area name
  flexOrder?: number;              // Flex order
  className?: string;              // Tailwind classes
}
```

---

## Layout Catalog (Inspired by shadcn Blocks)

### Layout 1: `sidebar-inset`
The classic dashboard layout with collapsible sidebar.

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├────────────┬────────────────────────────────────────┤
│            │ [breadcrumb]                           │
│ [sidebar]  ├────────────────────────────────────────┤
│            │                                        │
│            │ [main]                                 │
│            │                                        │
│            │                                        │
└────────────┴────────────────────────────────────────┘
```

**Outlets:**
- `header`: Site-wide header with logo, search, user menu
- `sidebar`: Navigation menu, collapsible on mobile
- `breadcrumb`: Current location breadcrumbs
- `main`: Primary content area (can contain nested outlets)

---

### Layout 2: `sidebar-with-tabs`
Dashboard with sidebar and tabbed content area (like Fakebooks "Sales" section).

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├────────────┬────────────────────────────────────────┤
│            │ [page-header]                          │
│ [sidebar]  ├────────────────────────────────────────┤
│            │ [tabs]                                 │
│            ├────────────────────────────────────────┤
│            │ [tab-content]                          │
│            │                                        │
└────────────┴────────────────────────────────────────┘
```

**Outlets:**
- `header`: Site header
- `sidebar`: Main navigation
- `page-header`: Page title and actions
- `tabs`: Tab navigation for sub-sections
- `tab-content`: Content for selected tab

---

### Layout 3: `master-detail`
List on left, detail on right (like Fakebooks invoices).

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├────────────────────────┬────────────────────────────┤
│ [summary]              │                            │
├────────────────────────┤                            │
│                        │ [detail]                   │
│ [list]                 │                            │
│                        │                            │
│                        │                            │
└────────────────────────┴────────────────────────────┘
```

**Outlets:**
- `header`: Section header with filters/actions
- `summary`: Aggregate stats/charts (like overdue/due soon bar)
- `list`: Scrollable list of items
- `detail`: Selected item detail view

---

### Layout 4: `auth-centered`
Centered authentication form with optional side panel.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  ┌───────────────┐                  │
│                  │ [logo]        │                  │
│                  │               │                  │
│                  │ [form]        │                  │
│                  │               │                  │
│                  │ [footer]      │                  │
│                  └───────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Outlets:**
- `logo`: Brand logo and tagline
- `form`: Login/signup form
- `footer`: Links (forgot password, sign up, etc.)

---

### Layout 5: `auth-split`
Split screen with branding on one side, form on other.

```
┌────────────────────────┬────────────────────────────┐
│                        │                            │
│                        │  [form-header]             │
│ [branding]             │                            │
│                        │  [form]                    │
│                        │                            │
│                        │  [form-footer]             │
│                        │                            │
└────────────────────────┴────────────────────────────┘
```

**Outlets:**
- `branding`: Hero image, testimonial, or feature highlights
- `form-header`: Form title and description
- `form`: Authentication form
- `form-footer`: Alternative actions, legal links

---

### Layout 6: `settings-sidebar`
Settings page with left navigation and content area.

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├────────────┬────────────────────────────────────────┤
│            │ [settings-header]                      │
│ [settings- ├────────────────────────────────────────┤
│  nav]      │                                        │
│            │ [settings-content]                     │
│            │                                        │
│            │ [settings-actions]                     │
└────────────┴────────────────────────────────────────┘
```

**Outlets:**
- `header`: Main app header
- `settings-nav`: Settings category navigation
- `settings-header`: Current settings page title
- `settings-content`: Settings form/content
- `settings-actions`: Save/cancel buttons

---

### Layout 7: `full-width`
Full-width content with optional header.

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [content]                                           │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Outlets:**
- `header`: Optional page header
- `content`: Full-width content area

---

### Layout 8: `marketing-hero`
Landing page with hero section.

```
┌─────────────────────────────────────────────────────┐
│ [nav]                                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [hero]                                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [features]                                          │
├─────────────────────────────────────────────────────┤
│ [cta]                                               │
├─────────────────────────────────────────────────────┤
│ [footer]                                            │
└─────────────────────────────────────────────────────┘
```

**Outlets:**
- `nav`: Navigation bar
- `hero`: Hero section with headline, subtext, CTA
- `features`: Feature grid/list
- `cta`: Call-to-action section
- `footer`: Page footer

---

### Layout 9: `wizard`
Multi-step wizard/onboarding flow.

```
┌─────────────────────────────────────────────────────┐
│ [header]                                            │
├─────────────────────────────────────────────────────┤
│ [progress]                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [step-content]                                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [navigation]                                        │
└─────────────────────────────────────────────────────┘
```

**Outlets:**
- `header`: Wizard title
- `progress`: Step indicator
- `step-content`: Current step form/content
- `navigation`: Back/Next buttons

---

### Layout 10: `modal-over-content`
Modal dialog over existing content.

```
┌─────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░┌─────────────────────┐░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░│ [modal-header]      │░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░│                     │░░░░░░░░░░░░░░░░░ │
│ ░[backdrop]│ [modal-content]     │░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░│                     │░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░│ [modal-actions]     │░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░└─────────────────────┘░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────┘
```

**Outlets:**
- `backdrop`: Background content (usually parent route)
- `modal-header`: Modal title and close button
- `modal-content`: Modal body
- `modal-actions`: Modal footer with buttons

---

## Search Params Deep Dive

### Built-in Parsers

Following nuqs conventions, we provide built-in parsers for common types:

```typescript
const searchParamParsers = {
  // String (default) - no transformation
  string: {
    parse: (v: string) => v,
    serialize: (v: string) => v,
  },

  // Integer - parseInt with NaN handling
  integer: {
    parse: (v: string) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    },
    serialize: (v: number) => v.toString(),
  },

  // Float - parseFloat with NaN handling
  float: {
    parse: (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    },
    serialize: (v: number) => v.toString(),
  },

  // Boolean - "true"/"false" or "1"/"0"
  boolean: {
    parse: (v: string) => v === "true" || v === "1",
    serialize: (v: boolean) => v ? "true" : "false",
  },

  // Timestamp - Unix epoch milliseconds
  timestamp: {
    parse: (v: string) => new Date(parseInt(v, 10)),
    serialize: (v: Date) => v.getTime().toString(),
  },

  // ISO DateTime - ISO 8601 string
  isoDateTime: {
    parse: (v: string) => new Date(v),
    serialize: (v: Date) => v.toISOString(),
  },

  // JSON - arbitrary JSON data
  json: {
    parse: (v: string) => JSON.parse(v),
    serialize: (v: unknown) => JSON.stringify(v),
  },

  // Array - comma-separated values
  array: {
    parse: (v: string) => v.split(",").filter(Boolean),
    serialize: (v: string[]) => v.join(","),
  },

  // Literal string enum
  stringEnum: (values: string[]) => ({
    parse: (v: string) => values.includes(v) ? v : null,
    serialize: (v: string) => v,
  }),
};
```

### Search Param Actions

New actions for manipulating URL state:

```typescript
// Built-in actions for search params
const searchParamActions = {
  // Set a single search param
  setSearchParam: {
    params: z.object({
      key: z.string(),
      value: z.unknown(),
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ key, value, history = "push" }) => {
      router.setSearchParam(key, value, { history });
    },
  },

  // Set multiple search params at once
  setSearchParams: {
    params: z.object({
      values: z.record(z.string(), z.unknown()),
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ values, history = "push" }) => {
      router.setSearchParams(values, { history });
    },
  },

  // Remove a search param
  removeSearchParam: {
    params: z.object({
      key: z.string(),
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ key, history = "push" }) => {
      router.removeSearchParam(key, { history });
    },
  },

  // Clear all search params
  clearSearchParams: {
    params: z.object({
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ history = "push" }) => {
      router.clearSearchParams({ history });
    },
  },

  // Toggle boolean search param
  toggleSearchParam: {
    params: z.object({
      key: z.string(),
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ key, history = "replace" }) => {
      const current = router.getSearchParam(key);
      router.setSearchParam(key, !current, { history });
    },
  },

  // Increment/decrement numeric search param
  incrementSearchParam: {
    params: z.object({
      key: z.string(),
      delta: z.number().default(1),
      min: z.number().optional(),
      max: z.number().optional(),
      history: z.enum(["push", "replace"]).optional(),
    }),
    handler: ({ key, delta, min, max, history = "replace" }) => {
      const current = router.getSearchParam(key) ?? 0;
      let next = current + delta;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      router.setSearchParam(key, next, { history });
    },
  },
};
```

### Complete Route Example with Search Params

```typescript
const invoicesRoute: RouteDefinition = {
  path: "invoices",
  layout: "master-detail",

  // Define typed search params for this route
  searchParams: {
    // Tab selection
    tab: {
      type: "stringEnum",
      enumValues: ["all", "overdue", "paid", "draft"],
      default: "all",
      description: "Filter invoices by status tab",
      history: "push",
    },

    // Pagination
    page: {
      type: "integer",
      default: 1,
      description: "Current page number",
      history: "replace",  // Don't pollute history with page changes
    },

    perPage: {
      type: "integer",
      default: 20,
      description: "Items per page",
      history: "replace",
    },

    // Sorting
    sort: {
      type: "string",
      default: "date",
      description: "Sort field (date, amount, customer)",
      history: "replace",
    },

    sortDir: {
      type: "stringEnum",
      enumValues: ["asc", "desc"],
      default: "desc",
      description: "Sort direction",
      history: "replace",
    },

    // Search/filter
    q: {
      type: "string",
      default: "",
      description: "Search query for filtering invoices",
      history: "push",
    },

    // Date range filter (JSON for complex objects)
    dateRange: {
      type: "json",
      default: null,
      description: "Date range filter { from: ISO, to: ISO }",
      history: "push",
    },

    // Multi-select status filter
    status: {
      type: "array",
      default: [],
      description: "Selected status filters (comma-separated)",
      history: "push",
    },

    // UI state
    showFilters: {
      type: "boolean",
      default: false,
      description: "Whether filter panel is expanded",
      history: "replace",
      shallow: true,  // Don't re-render server components
    },
  },

  // Loader can reference search params
  loader: {
    endpoint: "/api/invoices",
    // Search params automatically passed to endpoint
    mockData: { /* ... */ },
  },

  outlets: {
    summary: {
      description: "Summary bar showing totals, can filter by clicking segments",
      // AI knows about available search params
    },
    list: {
      description: "Invoice list with sorting, filtering, pagination. Use search params for state.",
      dataPath: "/invoices",
    },
    detail: {
      description: "Selected invoice or empty state",
    },
  },

  children: [
    {
      path: ":id",
      // Child inherits parent search params, can add more
      searchParams: {
        // Detail-specific params
        detailTab: {
          type: "stringEnum",
          enumValues: ["overview", "line-items", "payments", "history"],
          default: "overview",
          description: "Active tab in invoice detail view",
          history: "push",
        },
      },
      outlets: {
        detail: {
          description: "Invoice detail with tabs for overview, line items, payments, history",
        },
      },
    },
  ],
};
```

### Generated UI Using Search Params

The AI generates components that bind to search params:

```typescript
// Generated UITree for the list outlet
{
  root: "invoice-list-root",
  elements: {
    "invoice-list-root": {
      key: "invoice-list-root",
      type: "Stack",
      props: { gap: 4 },
      children: ["filters-row", "tab-bar", "invoice-table", "pagination"],
    },

    "filters-row": {
      key: "filters-row",
      type: "Stack",
      props: { direction: "row", justify: "between", align: "center" },
      children: ["search-input", "filter-toggle", "sort-select"],
    },

    "search-input": {
      key: "search-input",
      type: "Input",
      props: {
        placeholder: "Search invoices...",
        // Bind value to search param
        value: { path: "/$route/searchParams/q" },
        onChange: {
          action: "setSearchParam",
          params: {
            key: "q",
            value: { path: "/event/target/value" },
            history: "replace",  // Debounced, don't pollute history
          },
        },
      },
    },

    "filter-toggle": {
      key: "filter-toggle",
      type: "Button",
      props: {
        variant: "outline",
        children: "Filters",
        // Toggle filter panel visibility
        onClick: {
          action: "toggleSearchParam",
          params: { key: "showFilters" },
        },
      },
    },

    "sort-select": {
      key: "sort-select",
      type: "Select",
      props: {
        value: { path: "/$route/searchParams/sort" },
        onValueChange: {
          action: "setSearchParams",
          params: {
            values: {
              sort: { path: "/event/value" },
              page: 1,  // Reset to page 1 when sorting changes
            },
          },
        },
        options: [
          { value: "date", label: "Date" },
          { value: "amount", label: "Amount" },
          { value: "customer", label: "Customer" },
        ],
      },
    },

    "tab-bar": {
      key: "tab-bar",
      type: "Tabs",
      props: {
        value: { path: "/$route/searchParams/tab" },
        onValueChange: {
          action: "setSearchParams",
          params: {
            values: {
              tab: { path: "/event/value" },
              page: 1,  // Reset pagination when tab changes
            },
          },
        },
      },
      children: ["tab-all", "tab-overdue", "tab-paid", "tab-draft"],
    },

    "tab-all": {
      key: "tab-all",
      type: "TabsTrigger",
      props: { value: "all", children: "All" },
    },

    "tab-overdue": {
      key: "tab-overdue",
      type: "TabsTrigger",
      props: { value: "overdue", children: "Overdue" },
    },

    // ... more tab triggers

    "pagination": {
      key: "pagination",
      type: "Pagination",
      props: {
        currentPage: { path: "/$route/searchParams/page" },
        perPage: { path: "/$route/searchParams/perPage" },
        totalItems: { path: "/invoices/totalCount" },
        onPageChange: {
          action: "setSearchParam",
          params: {
            key: "page",
            value: { path: "/event/page" },
            history: "push",  // Pages should be navigable with back button
          },
        },
      },
    },
  },
}
```

### Server-Side Search Params Cache

For SSR/RSC support (like nuqs's `createSearchParamsCache`):

```typescript
// In route loader or server component
import { createSearchParamsCache } from "@json-render/core";

// Define cache with same schema as route
const searchParamsCache = createSearchParamsCache({
  tab: { type: "stringEnum", enumValues: ["all", "overdue", "paid", "draft"], default: "all" },
  page: { type: "integer", default: 1 },
  sort: { type: "string", default: "date" },
  q: { type: "string", default: "" },
});

// In server component or loader
export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);

  // Parse and validate search params
  const { tab, page, sort, q } = searchParamsCache.parse(url.searchParams);

  // Fetch data using typed params
  const invoices = await db.invoices.findMany({
    where: {
      status: tab !== "all" ? tab : undefined,
      OR: q ? [
        { customer: { contains: q } },
        { number: { contains: q } },
      ] : undefined,
    },
    orderBy: { [sort]: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  });

  return { invoices, totalCount: await db.invoices.count() };
}
```

### URL Shape Examples

Given the route `/sales/invoices/:id` with the search params defined above:

```
# Basic view
/sales/invoices
→ $route.searchParams = { tab: "all", page: 1, sort: "date", sortDir: "desc", q: "", status: [], showFilters: false }

# Filtered and sorted
/sales/invoices?tab=overdue&sort=amount&sortDir=asc&page=2
→ $route.searchParams = { tab: "overdue", page: 2, sort: "amount", sortDir: "asc", ... }

# With search query
/sales/invoices?q=acme&status=overdue,draft
→ $route.searchParams = { q: "acme", status: ["overdue", "draft"], ... }

# With date range (JSON encoded)
/sales/invoices?dateRange=%7B%22from%22%3A%222024-01-01%22%2C%22to%22%3A%222024-03-31%22%7D
→ $route.searchParams = { dateRange: { from: "2024-01-01", to: "2024-03-31" }, ... }

# Detail view with nested params
/sales/invoices/123?tab=overdue&detailTab=payments
→ $route.params = { id: "123" }
→ $route.searchParams = { tab: "overdue", detailTab: "payments", ... }
```

---

## App Definition Schema

When the AI generates an app, it produces an `AppDefinition`:

```typescript
interface AppDefinition {
  name: string;
  description: string;
  routes: RouteDefinition[];
  globalData: Record<string, unknown>;  // Shared data model
  theme?: ThemeConfig;
}

// Example: Fakebooks-style app with nuqs-style search params
const fakebooksApp: AppDefinition = {
  name: "Fakebooks",
  description: "Accounting software demo",
  globalData: {
    user: { name: "John Doe", role: "admin" },
    company: { name: "Fakebooks Inc." }
  },
  routes: [
    {
      path: "/",
      layout: "sidebar-inset",
      outlets: {
        header: {
          description: "Company logo 'Fakebooks' with green icon, minimal header"
        },
        sidebar: {
          description: "Navigation with: Dashboard, Accounts, Sales, Expenses, Reports. Highlight active based on $route.pathname"
        },
        main: {
          description: "Dashboard overview with key metrics"
        }
      },
      children: [
        {
          path: "sales",
          layout: "sidebar-with-tabs",

          // Search params for the sales section tab
          searchParams: {
            section: {
              type: "stringEnum",
              enumValues: ["overview", "subscriptions", "invoices", "customers", "deposits"],
              default: "overview",
              description: "Active sales sub-section",
              history: "push",
            },
          },

          outlets: {
            "page-header": {
              description: "Large 'Sales' heading"
            },
            tabs: {
              description: "Tabs bound to $route.searchParams.section: Overview, Subscriptions, Invoices, Customers, Deposits"
            },
            "tab-content": {
              description: "Content for selected tab based on $route.searchParams.section"
            }
          },
          children: [
            {
              path: "invoices",
              layout: "master-detail",

              // Comprehensive search params for invoice list
              searchParams: {
                // Filtering
                status: {
                  type: "stringEnum",
                  enumValues: ["all", "overdue", "due-soon", "invoiced", "paid"],
                  default: "all",
                  description: "Filter by invoice status",
                  history: "push",
                },
                q: {
                  type: "string",
                  default: "",
                  description: "Search by customer name or invoice number",
                  history: "replace",
                },

                // Sorting
                sort: {
                  type: "stringEnum",
                  enumValues: ["date", "amount", "customer", "dueDate"],
                  default: "date",
                  description: "Sort field",
                  history: "replace",
                },
                sortDir: {
                  type: "stringEnum",
                  enumValues: ["asc", "desc"],
                  default: "desc",
                  description: "Sort direction",
                  history: "replace",
                },

                // Pagination
                page: {
                  type: "integer",
                  default: 1,
                  description: "Current page",
                  history: "push",
                },

                // Date range (complex filter)
                from: {
                  type: "isoDateTime",
                  default: null,
                  description: "Filter invoices from this date",
                  history: "push",
                },
                to: {
                  type: "isoDateTime",
                  default: null,
                  description: "Filter invoices until this date",
                  history: "push",
                },
              },

              loader: {
                // Endpoint receives search params automatically
                endpoint: "/api/invoices?status={$route.searchParams.status}&page={$route.searchParams.page}",
                mockData: {
                  overdue: 10800,
                  dueSoon: 62000,
                  totalCount: 156,
                  invoices: [
                    { id: "1995", customer: "Santa Monica", amount: 10800, status: "overdue", date: "2024-01-15" },
                    { id: "2000", customer: "Stankonia", amount: 8000, status: "invoiced", date: "2024-01-20" },
                    { id: "2003", customer: "Ocean Avenue", amount: 6000, status: "paid", date: "2024-01-22" }
                  ]
                }
              },
              outlets: {
                summary: {
                  description: "Horizontal bar showing overdue ($10,800) in orange/red and due soon ($62,000) in green/yellow. Clicking a segment sets $route.searchParams.status",
                  dataPath: "/invoices"
                },
                list: {
                  description: "Invoice list with sorting (bound to $route.searchParams.sort/sortDir), filtering, and pagination (bound to $route.searchParams.page)",
                  dataPath: "/invoices/invoices"
                },
                detail: {
                  description: "Empty state prompting user to select an invoice, or shows selected invoice when :id route is active"
                }
              },
              children: [
                {
                  path: ":id",
                  layout: "master-detail",  // Inherits parent layout, fills detail outlet

                  // Additional search params for detail view
                  searchParams: {
                    detailTab: {
                      type: "stringEnum",
                      enumValues: ["overview", "line-items", "payments", "activity"],
                      default: "overview",
                      description: "Active tab in the detail panel",
                      history: "push",
                    },
                    editMode: {
                      type: "boolean",
                      default: false,
                      description: "Whether the invoice is in edit mode",
                      history: "replace",
                    },
                  },

                  outlets: {
                    detail: {
                      description: "Invoice detail card showing customer name ($route.params.id lookup), amount, status, date. Tabs bound to $route.searchParams.detailTab for overview/line-items/payments/activity",
                      dataPath: "/invoices/invoices/:id"  // :id is resolved from $route.params.id
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
```

---

## Implementation Architecture

### New Packages/Modules

```
packages/
├── core/
│   └── src/
│       ├── routes.ts          # Route types and validation
│       ├── layouts.ts         # Layout template definitions
│       └── app.ts             # AppDefinition schema
├── react/
│   └── src/
│       ├── router.tsx         # Router component and context
│       ├── outlet.tsx         # Outlet component
│       └── layout-renderer.tsx # Layout rendering logic
└── layouts/                   # NEW PACKAGE
    └── src/
        ├── index.ts
        ├── sidebar-inset.tsx
        ├── sidebar-with-tabs.tsx
        ├── master-detail.tsx
        ├── auth-centered.tsx
        ├── auth-split.tsx
        ├── settings-sidebar.tsx
        ├── full-width.tsx
        ├── marketing-hero.tsx
        ├── wizard.tsx
        └── modal-over-content.tsx
```

### Router Hooks API (`packages/react/src/router-hooks.ts`)

```typescript
import { useContext, useCallback, useMemo } from "react";
import { RouterContext } from "./router-context";

/**
 * nuqs-style hook for a single search param
 * Returns [value, setValue] tuple like useState
 */
export function useSearchParam<T>(
  key: string,
  options?: {
    default?: T;
    parse?: (v: string) => T;
    serialize?: (v: T) => string;
    history?: "push" | "replace";
    shallow?: boolean;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const router = useContext(RouterContext);
  const { default: defaultValue, parse, serialize, history = "push", shallow = false } = options ?? {};

  const value = useMemo(() => {
    const raw = router.searchParams.get(key);
    if (raw === null) return defaultValue as T;
    return parse ? parse(raw) : (raw as unknown as T);
  }, [router.searchParams, key, parse, defaultValue]);

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(value)
        : newValue;

      const serialized = serialize ? serialize(resolved) : String(resolved);
      router.setSearchParam(key, serialized, { history, shallow });
    },
    [router, key, value, serialize, history, shallow]
  );

  return [value, setValue];
}

/**
 * nuqs-style hook for multiple search params
 * Returns [values, setValues] tuple
 */
export function useSearchParams<T extends Record<string, unknown>>(
  schema: SearchParamsSchema<T>,
  options?: { history?: "push" | "replace"; shallow?: boolean }
): [T, (values: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  const router = useContext(RouterContext);
  const { history = "push", shallow = false } = options ?? {};

  const values = useMemo(() => {
    const result = {} as T;
    for (const [key, def] of Object.entries(schema)) {
      const raw = router.searchParams.get(key);
      result[key as keyof T] = raw !== null
        ? def.parse(raw)
        : def.default;
    }
    return result;
  }, [router.searchParams, schema]);

  const setValues = useCallback(
    (newValues: Partial<T> | ((prev: T) => Partial<T>)) => {
      const resolved = typeof newValues === "function"
        ? newValues(values)
        : newValues;

      const serialized: Record<string, string> = {};
      for (const [key, value] of Object.entries(resolved)) {
        if (value !== undefined && schema[key]) {
          serialized[key] = schema[key].serialize(value);
        }
      }
      router.setSearchParams(serialized, { history, shallow });
    },
    [router, values, schema, history, shallow]
  );

  return [values, setValues];
}

/**
 * Get path params (readonly)
 */
export function useParams(): Record<string, string> {
  const router = useContext(RouterContext);
  return router.params;
}

/**
 * Get specific path param
 */
export function useParam(key: string): string | undefined {
  const params = useParams();
  return params[key];
}

/**
 * Get current pathname
 */
export function usePathname(): string {
  const router = useContext(RouterContext);
  return router.pathname;
}

/**
 * Get full route state (for $route in DataProvider)
 */
export function useRouteState(): RouteState {
  const router = useContext(RouterContext);
  return {
    params: router.params,
    searchParams: router.parsedSearchParams,
    pathname: router.pathname,
    hash: router.hash,
    segments: router.pathname.split("/").filter(Boolean),
    matchedRoutes: router.matchedRoutes.map(r => r.path),
  };
}

/**
 * Navigation function
 */
export function useNavigate() {
  const router = useContext(RouterContext);

  return useCallback(
    (
      to: string,
      options?: {
        replace?: boolean;
        state?: unknown;
        preserveSearchParams?: boolean;
      }
    ) => {
      router.navigate(to, options);
    },
    [router]
  );
}

/**
 * Full router access
 */
export function useRouter() {
  return useContext(RouterContext);
}
```

### Core Types (`packages/core/src/routes.ts`)

```typescript
import { z } from "zod";

// Search param type enum
export const SearchParamTypeSchema = z.union([
  z.literal("string"),
  z.literal("integer"),
  z.literal("float"),
  z.literal("boolean"),
  z.literal("timestamp"),
  z.literal("isoDateTime"),
  z.literal("json"),
  z.literal("stringEnum"),
  z.literal("integerEnum"),
  z.literal("array"),
  z.literal("delimitedArray"),
  z.object({ custom: z.string() }),
]);

// Search param definition schema
export const SearchParamDefinitionSchema = z.object({
  type: SearchParamTypeSchema,
  default: z.unknown().optional(),
  description: z.string(),
  history: z.enum(["push", "replace"]).optional(),
  shallow: z.boolean().optional(),
  // For enum types
  enumValues: z.array(z.union([z.string(), z.number()])).optional(),
  // For array types
  delimiter: z.string().optional(),
});

// Outlet configuration for AI generation
export const OutletConfigSchema = z.object({
  description: z.string(),
  constraints: z.array(z.string()).optional(),
  dataPath: z.string().optional(),
  priority: z.number().optional(),
});

// Data loader configuration
export const DataLoaderSchema = z.object({
  endpoint: z.string().optional(),
  mockData: z.unknown().optional(),
  params: z.array(z.string()).optional(),
});

// Route definition
export const RouteDefinitionSchema: z.ZodType<RouteDefinition> = z.lazy(() =>
  z.object({
    path: z.string(),
    layout: z.string(),
    outlets: z.record(z.string(), OutletConfigSchema),
    // NEW: nuqs-style search params definition
    searchParams: z.record(z.string(), SearchParamDefinitionSchema).optional(),
    loader: DataLoaderSchema.optional(),
    children: z.array(RouteDefinitionSchema).optional(),
  })
);

// App definition
export const AppDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  routes: z.array(RouteDefinitionSchema),
  globalData: z.record(z.string(), z.unknown()).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    mode: z.enum(["light", "dark", "system"]).optional(),
  }).optional(),
});

export type SearchParamType = z.infer<typeof SearchParamTypeSchema>;
export type SearchParamDefinition = z.infer<typeof SearchParamDefinitionSchema>;
export type OutletConfig = z.infer<typeof OutletConfigSchema>;
export type DataLoaderConfig = z.infer<typeof DataLoaderSchema>;
export type RouteDefinition = {
  path: string;
  layout: string;
  outlets: Record<string, OutletConfig>;
  searchParams?: Record<string, SearchParamDefinition>;  // nuqs-style params
  loader?: DataLoaderConfig;
  children?: RouteDefinition[];
};
export type AppDefinition = z.infer<typeof AppDefinitionSchema>;
```

### Layout Registry (`packages/core/src/layouts.ts`)

```typescript
export interface OutletDefinition {
  name: string;
  description: string;
  renderHints: string;
  position: {
    gridArea?: string;
    className?: string;
  };
  constraints?: {
    allowedComponents?: string[];
    suggestedComponents?: string[];
  };
}

export interface LayoutTemplate {
  name: string;
  description: string;
  outlets: Record<string, OutletDefinition>;
  gridTemplate: string;  // CSS grid template
  className?: string;    // Additional Tailwind classes
}

// Layout registry
export const layoutTemplates: Record<string, LayoutTemplate> = {
  "sidebar-inset": {
    name: "Sidebar Inset",
    description: "Classic dashboard layout with collapsible sidebar, header, and main content area",
    gridTemplate: `
      "header header" auto
      "sidebar main" 1fr
      / auto 1fr
    `,
    className: "min-h-screen",
    outlets: {
      header: {
        name: "header",
        description: "Site-wide header with logo, search, and user menu",
        renderHints: "Keep minimal. Include logo on left, search in center (optional), user avatar/menu on right.",
        position: { gridArea: "header", className: "border-b" },
        constraints: {
          suggestedComponents: ["Header", "Stack", "Button", "Avatar"]
        }
      },
      sidebar: {
        name: "sidebar",
        description: "Navigation menu with links to main sections",
        renderHints: "Vertical stack of navigation links. Use icons. Highlight active item. Consider collapsible groups.",
        position: { gridArea: "sidebar", className: "w-64 border-r bg-muted/40" },
        constraints: {
          suggestedComponents: ["Nav", "NavItem", "Stack", "Separator"]
        }
      },
      main: {
        name: "main",
        description: "Primary content area",
        renderHints: "This is where the main page content renders. Can contain any components.",
        position: { gridArea: "main", className: "p-6" }
      }
    }
  },
  // ... other layouts
};

export function getLayout(name: string): LayoutTemplate | undefined {
  return layoutTemplates[name];
}

export function generateLayoutPrompt(layout: LayoutTemplate): string {
  const outletDescriptions = Object.entries(layout.outlets)
    .map(([key, outlet]) => `- ${key}: ${outlet.description}\n  Hints: ${outlet.renderHints}`)
    .join("\n");

  return `Layout: ${layout.name}
Description: ${layout.description}

Outlets:
${outletDescriptions}`;
}
```

---

## Generation Flow

### Phase 1: App Structure Generation

When user prompts "Build me an accounting app like Fakebooks":

1. AI generates an `AppDefinition` with routes, layouts, and outlet descriptions
2. This is a quick, schema-constrained generation
3. Result is validated against `AppDefinitionSchema`

### Phase 2: Parallel Outlet Generation

For each route in the app:

1. Resolve the layout template
2. For each outlet in the route:
   - Create a generation context with:
     - Outlet description from route
     - Layout hints from template
     - Data context (mock data or real)
   - Stream UITree generation in parallel
3. Compose outlet UITrees into the layout
4. Store results for visualization

```typescript
async function generateRouteUI(
  route: RouteDefinition,
  catalog: Catalog,
  data: Record<string, unknown>
): Promise<Record<string, UITree>> {
  const layout = getLayout(route.layout);
  if (!layout) throw new Error(`Unknown layout: ${route.layout}`);

  // Generate all outlets in parallel
  const outletPromises = Object.entries(route.outlets).map(
    async ([outletName, config]) => {
      const layoutOutlet = layout.outlets[outletName];
      const prompt = buildOutletPrompt(config, layoutOutlet, data);

      const tree = await generateUITree({
        prompt,
        catalog,
        context: {
          data: config.dataPath ? getByPath(data, config.dataPath) : data,
          constraints: config.constraints,
        }
      });

      return [outletName, tree] as const;
    }
  );

  const results = await Promise.all(outletPromises);
  return Object.fromEntries(results);
}

function buildOutletPrompt(
  config: OutletConfig,
  layoutOutlet: OutletDefinition,
  data: unknown
): string {
  return `Generate UI for the "${layoutOutlet.name}" outlet.

DESCRIPTION: ${config.description}

LAYOUT HINTS: ${layoutOutlet.renderHints}

${layoutOutlet.constraints?.suggestedComponents
  ? `SUGGESTED COMPONENTS: ${layoutOutlet.constraints.suggestedComponents.join(", ")}`
  : ""}

AVAILABLE DATA:
${JSON.stringify(data, null, 2)}

Generate a UITree that fits this outlet's purpose.`;
}
```

---

## Visualization Component (Remix-style)

A React component that renders the app structure with hover interactions:

```typescript
interface RouteVisualizerProps {
  app: AppDefinition;
  currentPath: string;
  generatedUI: Record<string, Record<string, UITree>>;  // path -> outlet -> tree
  onNavigate: (path: string) => void;
}

function RouteVisualizer({ app, currentPath, generatedUI, onNavigate }: RouteVisualizerProps) {
  const [hoveredOutlet, setHoveredOutlet] = useState<string | null>(null);
  const matchedRoutes = matchRoutes(app.routes, currentPath);

  return (
    <div className="route-visualizer">
      {/* URL bar showing current path with highlighted segments */}
      <UrlBar
        path={currentPath}
        routes={matchedRoutes}
        onSegmentHover={setHoveredOutlet}
      />

      {/* Rendered layouts with outlet highlighting */}
      <div className="preview-container">
        {matchedRoutes.map((route, index) => (
          <LayoutRenderer
            key={route.path}
            route={route}
            outlets={generatedUI[route.path]}
            highlightedOutlet={hoveredOutlet}
            depth={index}
          />
        ))}
      </div>

      {/* Code/data panel (like Remix shows import/fetch) */}
      {hoveredOutlet && (
        <OutletInfoPanel
          outlet={hoveredOutlet}
          route={matchedRoutes.find(r => r.outlets[hoveredOutlet])}
        />
      )}
    </div>
  );
}

function LayoutRenderer({ route, outlets, highlightedOutlet, depth }) {
  const layout = getLayout(route.layout);

  return (
    <div
      className={cn(
        "layout-container",
        layout.className,
        depth > 0 && "nested-layout"
      )}
      style={{ display: "grid", gridTemplate: layout.gridTemplate }}
    >
      {Object.entries(layout.outlets).map(([name, outletDef]) => (
        <div
          key={name}
          className={cn(
            "outlet",
            outletDef.position.className,
            highlightedOutlet === name && "outlet-highlighted"
          )}
          style={{ gridArea: outletDef.position.gridArea }}
          onMouseEnter={() => setHoveredOutlet(name)}
          onMouseLeave={() => setHoveredOutlet(null)}
        >
          {outlets[name] ? (
            <Renderer tree={outlets[name]} registry={registry} />
          ) : (
            <OutletPlaceholder name={name} description={outletDef.description} />
          )}

          {/* Outlet label overlay */}
          <div className="outlet-label">{name}</div>
        </div>
      ))}
    </div>
  );
}
```

---

## API Endpoints

### POST `/api/generate-app`
Generate the app structure (routes, layouts, outlets).

```typescript
// Request
{
  prompt: "Build me an accounting app like QuickBooks",
  options?: {
    includeAuth?: boolean;
    includeSettings?: boolean;
  }
}

// Response (streamed)
{
  app: AppDefinition
}
```

### POST `/api/generate-outlets`
Generate UI for all outlets in a route (parallel).

```typescript
// Request
{
  route: RouteDefinition,
  data: Record<string, unknown>,
  catalog: string  // catalog name
}

// Response (streamed, one line per outlet)
{"outlet": "header", "tree": UITree}
{"outlet": "sidebar", "tree": UITree}
{"outlet": "main", "tree": UITree}
```

---

## Implementation Phases

### Phase 1: Core Types & Layout Registry
- [ ] Add route types to `packages/core`
- [ ] Add layout types to `packages/core`
- [ ] Create layout template registry
- [ ] Add AppDefinition schema
- [ ] Write tests for new schemas

### Phase 2: Layout Components
- [ ] Create new `packages/layouts` package
- [ ] Implement 10 base layouts as React components
- [ ] Each layout renders CSS grid with outlet slots
- [ ] Add outlet placeholder component

### Phase 3: Router Infrastructure
- [ ] Add RouterProvider context to `packages/react`
- [ ] Implement route matching logic
- [ ] Add Outlet component for nested rendering
- [ ] Add nuqs-style hooks:
  - [ ] `useSearchParam(key, parser)` - Single param with setter
  - [ ] `useSearchParams(schema)` - Multiple params with setters
  - [ ] `useParams()` - Path params (readonly)
  - [ ] `usePathname()` - Current path
  - [ ] `useNavigate()` - Programmatic navigation
  - [ ] `useRouter()` - Full router context
- [ ] Implement search params cache for SSR
- [ ] Add $route injection to DataProvider

### Phase 4: Parallel Generation
- [ ] Create parallel outlet generation API
- [ ] Modify useUIStream to support multiple concurrent streams
- [ ] Add generation progress tracking per outlet
- [ ] Implement outlet composition into layout

### Phase 5: Visualization UI
- [ ] Create RouteVisualizer component
- [ ] Add URL bar with segment highlighting
- [ ] Implement outlet hover highlighting (like Remix)
- [ ] Add code/data info panel
- [ ] Create route tree sidebar

### Phase 6: App Generation API
- [ ] Create /api/generate-app endpoint
- [ ] Add system prompt for app structure generation
- [ ] Implement app validation and refinement
- [ ] Add example apps to documentation

### Phase 7: Integration & Polish
- [ ] Integrate with existing playground
- [ ] Add route editing UI
- [ ] Add outlet regeneration (click to regenerate single outlet)
- [ ] Performance optimization for large apps
- [ ] Documentation

---

## Example User Flow

1. User: "Build me a project management app"

2. AI generates AppDefinition:
```json
{
  "name": "ProjectHub",
  "routes": [
    {
      "path": "/",
      "layout": "sidebar-inset",
      "outlets": {
        "sidebar": { "description": "Nav: Dashboard, Projects, Team, Settings" },
        "main": { "description": "Dashboard with project cards and activity feed" }
      },
      "children": [
        {
          "path": "projects/:id",
          "layout": "master-detail",
          "outlets": {
            "list": { "description": "Task list grouped by status" },
            "detail": { "description": "Selected task details with comments" }
          }
        }
      ]
    }
  ]
}
```

3. System displays route structure visualization

4. User can:
   - Hover over URL segments to highlight outlets
   - See mock data in each outlet
   - Click outlets to regenerate
   - Edit outlet descriptions
   - Add/remove routes

5. When satisfied, export as:
   - Next.js App Router project
   - Remix project
   - Static JSON for json-render

---

## Open Questions

1. **Layout inheritance**: Should child routes inherit parent layout outlets, or completely replace?
   - Recommendation: Inherit by default, with option to override specific outlets

2. **Data flow**: How should data from parent routes flow to child routes?
   - Recommendation: Merge data contexts, child can access parent data via paths

3. **Animation**: Should outlet transitions be animated?
   - Recommendation: Yes, subtle fade/slide for better UX

4. **Mobile layouts**: Should layouts have responsive variants?
   - Recommendation: Yes, each layout should define mobile breakpoint behavior

5. **Custom layouts**: Should users be able to define their own layouts?
   - Recommendation: Yes, in a later phase

---

## Success Metrics

- [ ] Can generate a Fakebooks-like app from a single prompt
- [ ] All outlets render in parallel (< 2s latency increase vs sequential)
- [ ] Hover interaction shows route/outlet relationship clearly
- [ ] Can export to working Next.js/Remix project
- [ ] Layout catalog covers 90% of common SaaS patterns

---

## References

- [Remix Routing Documentation](https://remix.run/docs/en/main/discussion/routes)
- [shadcn/ui Blocks](https://ui.shadcn.com/blocks)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Router Outlets](https://reactrouter.com/en/main/components/outlet)
- [nuqs - Type-safe search params state management](https://nuqs.dev/)
- [nuqs GitHub Repository](https://github.com/47ng/nuqs)
- [Managing search parameters in Next.js with nuqs - LogRocket](https://blog.logrocket.com/managing-search-parameters-next-js-nuqs/)
