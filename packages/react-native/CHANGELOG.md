# @json-render/react-native

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
