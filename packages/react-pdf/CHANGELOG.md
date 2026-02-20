# @json-render/react-pdf

## 0.8.0

### Minor Changes

- 09376db: New `@json-render/react-pdf` package for generating PDF documents from JSON specs.

  ### New: `@json-render/react-pdf`

  PDF renderer for json-render, powered by `@react-pdf/renderer`. Define catalogs and registries the same way as `@json-render/react`, but output PDF documents instead of web UI.
  - `renderToBuffer(spec)` — render a spec to an in-memory PDF buffer
  - `renderToStream(spec)` — render to a readable stream (pipe to HTTP response)
  - `renderToFile(spec, path)` — render directly to a file on disk
  - `defineRegistry` / `createRenderer` — same API as `@json-render/react` for custom components
  - `standardComponentDefinitions` — Zod-based catalog definitions (server-safe via `@json-render/react-pdf/catalog`)
  - `standardComponents` — React PDF implementations for all standard components
  - Server-safe import via `@json-render/react-pdf/server`

  Standard components:
  - **Document structure**: Document, Page
  - **Layout**: View, Row, Column
  - **Content**: Heading, Text, Image, Link
  - **Data**: Table, List
  - **Decorative**: Divider, Spacer
  - **Page-level**: PageNumber

  Includes full context support: state management, visibility conditions, actions, validation, and repeat scopes — matching the capabilities of `@json-render/react`.

### Patch Changes

- Updated dependencies [09376db]
  - @json-render/core@0.8.0
