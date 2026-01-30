# JSON-Render Routes & Layouts Plan

## Overview

Add a route-based layout system to json-render inspired by Remix's nested routing pattern. When generating an app, the AI will:

1. Define routes where each path segment maps to a layout
2. Each layout has named outlets with descriptions
3. Outlets are filled in parallel using json-render's existing streaming generation
4. The result is an interactive visualization (like Remix's Fakebooks demo) where users can hover over sections to see the route/outlet structure

---

## Core Concepts

### 1. Route Definition

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

// Example: Fakebooks-style app
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
          description: "Navigation with: Dashboard, Accounts, Sales, Expenses, Reports"
        },
        main: {
          description: "Dashboard overview with key metrics"
        }
      },
      children: [
        {
          path: "sales",
          layout: "sidebar-with-tabs",
          outlets: {
            "page-header": {
              description: "Large 'Sales' heading"
            },
            tabs: {
              description: "Tabs: Overview, Subscriptions, Invoices, Customers, Deposits"
            },
            "tab-content": {
              description: "Content for selected tab"
            }
          },
          children: [
            {
              path: "invoices",
              layout: "master-detail",
              loader: {
                mockData: {
                  overdue: 10800,
                  dueSoon: 62000,
                  invoices: [
                    { id: "1995", customer: "Santa Monica", amount: 10800, status: "overdue" },
                    { id: "2000", customer: "Stankonia", amount: 8000, status: "invoiced" },
                    { id: "2003", customer: "Ocean Avenue", amount: 6000, status: "paid" }
                  ]
                }
              },
              outlets: {
                summary: {
                  description: "Horizontal bar showing overdue ($10,800) in orange/red and due soon ($62,000) in green/yellow",
                  dataPath: "/invoices"
                },
                list: {
                  description: "Invoice list with customer name, year, amount, and status badge",
                  dataPath: "/invoices/invoices"
                },
                detail: {
                  description: "Empty state or selected invoice details"
                }
              },
              children: [
                {
                  path: ":id",
                  layout: "master-detail",  // Inherits parent layout, fills detail outlet
                  outlets: {
                    detail: {
                      description: "Invoice detail card showing customer name, amount, status, date, and plan",
                      dataPath: "/invoices/invoices/:id"
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

### Core Types (`packages/core/src/routes.ts`)

```typescript
import { z } from "zod";

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

export type OutletConfig = z.infer<typeof OutletConfigSchema>;
export type DataLoaderConfig = z.infer<typeof DataLoaderSchema>;
export type RouteDefinition = {
  path: string;
  layout: string;
  outlets: Record<string, OutletConfig>;
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
- [ ] Add useNavigate, useParams, useLocation hooks

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
