# @json-render/react

## 0.8.0

### Patch Changes

- Updated dependencies [09376db]
  - @json-render/core@0.8.0

## 0.7.0

### Minor Changes

- 2d70fab: New `@json-render/shadcn` package, event handles, built-in actions, and stream improvements.

  ### New: `@json-render/shadcn` Package

  Pre-built [shadcn/ui](https://ui.shadcn.com/) component library for json-render. 30+ components built on Radix UI + Tailwind CSS, ready to use with `defineCatalog` and `defineRegistry`.
  - `shadcnComponentDefinitions` — Zod-based catalog definitions for all components (server-safe, no React dependency via `@json-render/shadcn/catalog`)
  - `shadcnComponents` — React implementations for all components
  - Layout: Card, Stack, Grid, Separator
  - Navigation: Tabs, Accordion, Collapsible, Pagination
  - Overlay: Dialog, Drawer, Tooltip, Popover, DropdownMenu
  - Content: Heading, Text, Image, Avatar, Badge, Alert, Carousel, Table
  - Feedback: Progress, Skeleton, Spinner
  - Input: Button, Link, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Toggle, ToggleGroup, ButtonGroup

  ### New: Event Handles (`on()`)

  Components now receive an `on(event)` function in addition to `emit(event)`. The `on()` function returns an `EventHandle` with metadata:
  - `emit()` — fire the event
  - `shouldPreventDefault` — whether any action binding requested `preventDefault`
  - `bound` — whether any handler is bound to this event

  ### New: `BaseComponentProps`

  Catalog-agnostic base type for component render functions. Use when building reusable component libraries (like `@json-render/shadcn`) that are not tied to a specific catalog.

  ### New: Built-in Actions in Schema

  Schemas can now declare `builtInActions` — actions that are always available at runtime and automatically injected into prompts. The React schema declares `setState`, `pushState`, and `removeState` as built-in, so they appear in prompts without needing to be listed in catalog `actions`.

  ### New: `preventDefault` on `ActionBinding`

  Action bindings now support a `preventDefault` boolean field, allowing the LLM to request that default browser behavior (e.g. navigation on links) be prevented.

  ### Improved: Stream Transform Text Block Splitting

  `createJsonRenderTransform()` now properly splits text blocks around spec data by emitting `text-end`/`text-start` pairs. This ensures the AI SDK creates separate text parts, preserving correct interleaving of prose and UI in `message.parts`.

  ### Improved: `defineRegistry` Actions Requirement

  `defineRegistry` now conditionally requires the `actions` field only when the catalog declares actions. Catalogs with no actions (e.g. `actions: {}`) no longer need to pass an empty actions object.

### Patch Changes

- Updated dependencies [2d70fab]
  - @json-render/core@0.7.0

## 0.6.1

### Patch Changes

- 43ad534: Fix infinite re-render loop caused by multiple unbound form inputs (Input, Textarea, Select) all registering field validation at the same empty path with different `checks` configs, causing them to overwrite each other endlessly. Stabilize context values in ActionProvider, ValidationProvider, and useUIStream by using refs for state/callbacks, preventing unnecessary re-render cascades on every state update.
  - @json-render/core@0.6.1

## 0.6.1

### Patch Changes

- ea97aff: Fix infinite re-render loop caused by multiple unbound form inputs (Input, Textarea, Select) all registering field validation at the same empty path with different `checks` configs, causing them to overwrite each other endlessly. Stabilize context values in ActionProvider, ValidationProvider, and useUIStream by using refs for state/callbacks, preventing unnecessary re-render cascades on every state update.
- Updated dependencies [ea97aff]
  - @json-render/core@0.6.1

## 0.6.0

### Minor Changes

- 06b8745: Chat mode (inline GenUI), AI SDK integration, two-way binding, and expression-based visibility/props.

  ### New: Chat Mode (Inline GenUI)

  Two generation modes: **Generate** (JSONL-only, the default) and **Chat** (text + JSONL inline). Chat mode lets AI respond conversationally with embedded UI specs — ideal for chatbots and copilot experiences.
  - `catalog.prompt({ mode: "chat" })` generates a chat-aware system prompt
  - `pipeJsonRender()` server-side transform separates text from JSONL patches in a mixed stream
  - `createJsonRenderTransform()` low-level TransformStream for custom pipelines

  ### New: AI SDK Integration

  First-class Vercel AI SDK support with typed data parts and stream utilities.
  - `SpecDataPart` type for `data-spec` stream parts (patch, flat, nested payloads)
  - `SPEC_DATA_PART` / `SPEC_DATA_PART_TYPE` constants for type-safe part filtering
  - `createMixedStreamParser()` for parsing mixed text + JSONL streams

  ### New: React Chat Hooks
  - `useChatUI()` — full chat hook with message history, streaming, and spec extraction
  - `useJsonRenderMessage()` — extract spec + text from a message's parts array
  - `buildSpecFromParts()` / `getTextFromParts()` — utilities for working with AI SDK message parts
  - `useBoundProp()` — two-way binding hook for `$bindState` / `$bindItem` expressions

  ### New: Two-Way Binding

  Props can now use `$bindState` and `$bindItem` expressions for two-way data binding. The renderer resolves bindings and passes a `bindings` map to components, enabling write-back to state.

  ### New: Expression-Based Props and Visibility

  Replaced string token rewriting with structured expression objects:
  - Props: `{ $state: "/path" }`, `{ $item: "field" }`, `{ $index: true }`
  - Visibility: `{ $state: "/path", eq: "value" }`, `{ $item: "active" }`, `{ $index: true, gt: 0 }`
  - Logic: `{ $and: [...] }`, `{ $or: [...] }`, and implicit AND via arrays
  - Comparison operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`

  ### New: Utilities
  - `applySpecPatch()` — typed convenience wrapper for applying a single patch to a Spec
  - `nestedToFlat()` — convert nested tree specs to flat `{ root, elements }` format
  - `resolveBindings()` / `resolveActionParam()` — resolve binding paths and action params

  ### New: Chat Example

  Full-featured chat example (`examples/chat`) with AI agent, tool calls (crypto, GitHub, Hacker News, weather, search), theme toggle, and streaming UI generation.

  ### Improved: Renderer
  - `ElementRenderer` is now `React.memo`'d for better performance in repeat lists
  - `emit` is always defined (never `undefined`) — no more optional chaining needed
  - Action params are resolved through `resolveActionParam` supporting `$item`, `$index`, `$state`
  - Repeat scope now passes the actual item object instead of requiring token rewriting

  ### Breaking Changes
  - **Expressions renamed**: `{ $path }` / `{ path }` replaced by `{ $state }`, `{ $item }`, `{ $index }`
  - **Visibility conditions**: `{ path }` → `{ $state }`, `{ and/or/not }` → `{ $and/$or }` with `not` as operator flag
  - **DynamicValue**: `{ path: string }` → `{ $state: string }`
  - **Repeat field**: `repeat.path` → `repeat.statePath`
  - **Action params**: `path` → `statePath` in setState action params
  - **Provider props**: `actionHandlers` → `handlers` on `JSONUIProvider`/`ActionProvider`
  - **Auth removed**: `AuthState` type and `{ auth }` visibility conditions removed — model auth as regular state
  - **Legacy catalog removed**: `createCatalog`, `generateCatalogPrompt`, `generateSystemPrompt`, `ComponentDefinition`, `CatalogConfig`, `SystemPromptOptions` removed
  - **React exports removed**: `createRendererFromCatalog`, `rewriteRepeatTokens`
  - **Codegen**: `traverseTree` → `traverseSpec`, `SpecVisitor` → `TreeVisitor`

### Patch Changes

- Updated dependencies [06b8745]
  - @json-render/core@0.6.0

## 0.5.2

### Patch Changes

- 429e456: Fix LLM hallucinations by dynamically generating prompt examples from the user's catalog instead of hardcoding component names. Adds optional `example` field to `ComponentDefinition` with Zod schema introspection fallback. Mentions RFC 6902 in output format section.
- Updated dependencies [429e456]
  - @json-render/core@0.5.2

## 0.5.1

### Patch Changes

- d9a4efd: Prevent rendering errors from crashing the application. Added error boundaries to all renderers so a single bad component silently disappears instead of causing a white-screen-of-death. Fixed Select and Radio components to handle non-string option values from AI output.
  - @json-render/core@0.5.1

## 0.5.0

### Minor Changes

- 3d2d1ad: Add @json-render/react-native package, event system (emit replaces onAction), repeat/list rendering, user prompt builder, spec validation, and rename DataProvider to StateProvider.

### Patch Changes

- Updated dependencies [3d2d1ad]
  - @json-render/core@0.5.0

## 0.4.4

### Patch Changes

- dd17549: remove key/parentKey from flat specs, RFC 6902 compliance for SpecStream
- Updated dependencies [dd17549]
  - @json-render/core@0.4.4

## 0.4.3

### Patch Changes

- 61ee8e5: include remove op in system prompt
- Updated dependencies [61ee8e5]
  - @json-render/core@0.4.3

## 0.4.2

### Patch Changes

- 54bce09: add defineRegistry function
- Updated dependencies [54bce09]
  - @json-render/core@0.4.2
