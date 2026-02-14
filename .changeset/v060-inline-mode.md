---
"@json-render/core": minor
"@json-render/react": minor
"@json-render/react-native": minor
"@json-render/codegen": minor
"@json-render/remotion": minor
---

Chat mode (inline GenUI), AI SDK integration, two-way binding, and expression-based visibility/props.

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
