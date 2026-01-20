export {
  traverseTree,
  collectUsedComponents,
  collectDataPaths,
  collectActions,
  type TreeVisitor,
} from "./traverse";

export {
  serializePropValue,
  serializeProps,
  escapeString,
  type SerializeOptions,
} from "./serialize";

export type { GeneratedFile, CodeGenerator } from "./types";

// Slice Generator (RTK)
export {
  generateSliceCode,
  generateStoreCode,
  generateHooksCode,
  generateProviderCode,
} from "./slice-generator";

// TanStack DB Generator
export {
  generateCollectionCode,
  generateMutationCode,
  generateQueryClientCode,
  generateDBSetupCode,
  generateDBProvidersCode,
  generateTanStackDBFiles,
} from "./tanstack-db-generator";

// Cross-Source Selector Generator
export {
  generateCrossSourceSelectorCode,
  generateSelectorsIndexCode,
  generateSelectorFiles,
} from "./selector-generator";
