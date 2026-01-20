// Types
export type {
  DynamicValue,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  UIElement,
  UITree,
  VisibilityCondition,
  LogicExpression,
  AuthState,
  DataModel,
  ComponentSchema,
  ValidationMode,
  PatchOp,
  JsonPatch,
} from "./types";

export {
  DynamicValueSchema,
  DynamicStringSchema,
  DynamicNumberSchema,
  DynamicBooleanSchema,
  resolveDynamicValue,
  getByPath,
  setByPath,
} from "./types";

// Visibility
export type { VisibilityContext } from "./visibility";

export {
  VisibilityConditionSchema,
  LogicExpressionSchema,
  evaluateVisibility,
  evaluateLogicExpression,
  visibility,
} from "./visibility";

// Actions
export type {
  Action,
  ActionConfirm,
  ActionOnSuccess,
  ActionOnError,
  ActionHandler,
  ActionDefinition,
  ResolvedAction,
  ActionExecutionContext,
} from "./actions";

export {
  ActionSchema,
  ActionConfirmSchema,
  ActionOnSuccessSchema,
  ActionOnErrorSchema,
  resolveAction,
  executeAction,
  interpolateString,
  action,
} from "./actions";

// Validation
export type {
  ValidationCheck,
  ValidationConfig,
  ValidationFunction,
  ValidationFunctionDefinition,
  ValidationCheckResult,
  ValidationResult,
  ValidationContext,
} from "./validation";

export {
  ValidationCheckSchema,
  ValidationConfigSchema,
  builtInValidationFunctions,
  runValidationCheck,
  runValidation,
  check,
} from "./validation";

// Catalog
export type {
  ComponentDefinition,
  CatalogConfig,
  Catalog,
  InferCatalogComponentProps,
} from "./catalog";

export { createCatalog, generateCatalogPrompt } from "./catalog";

// Table Schema
export type {
  FieldType,
  Column,
  ColumnConstraints,
  Relationship,
  Index,
  TableSchema,
  DatabaseSchema,
} from "./table-schema";

export {
  FieldTypeSchema,
  ColumnSchema,
  ColumnConstraintsSchema,
  RelationshipSchema,
  IndexSchema,
  TableSchemaDefinition,
  DatabaseSchemaDefinition,
  tableToZodSchema,
  tableToTypeScript,
  tableToSQL,
  getDefaultForType,
} from "./table-schema";

// Collection Schema (TanStack DB)
export type {
  QueryOperator,
  StateReference,
  FilterCondition,
  SortDefinition,
  JoinDefinition,
  CollectionSource,
  FieldSelection,
  LiveQuery,
  CollectionSourceType,
  CollectionDefinition,
  MutationSideEffects,
  MutationValidation,
  MutationDefinition,
  TanStackDBConfig,
} from "./collection-schema";

export {
  QueryOperatorSchema,
  StateReferenceSchema,
  FilterConditionSchema,
  SortDefinitionSchema,
  JoinDefinitionSchema,
  CollectionSourceSchema,
  FieldSelectionSchema,
  LiveQuerySchema,
  CollectionDefinitionSchema,
  MutationDefinitionSchema,
  TanStackDBConfigSchema,
  createQueryCollection,
  createLiveQuery,
  createMutation,
} from "./collection-schema";

// Slice Schema (RTK)
export type {
  StateValueType,
  StateField,
  Payload,
  Reducer,
  Thunk,
  SimpleSelector,
  DerivedSelector,
  ParameterizedSelector,
  Selector,
  SliceDefinition,
  SliceCollection,
  SelectorInput as SliceSelectorInput,
  Computation,
  SelectorParam,
} from "./slice-schema";

export {
  StateValueTypeSchema,
  StateFieldSchema,
  PayloadSchema,
  ReducerSchema,
  ThunkSchema,
  SimpleSelectorSchema,
  DerivedSelectorSchema,
  ParameterizedSelectorSchema,
  SelectorSchema,
  SliceDefinitionSchema,
  SliceCollectionSchema,
  mapStateTypeToTS,
  getDefaultForStateType,
  createSlice,
  simpleSelector,
  derivedSelector,
  parameterizedSelector,
} from "./slice-schema";

// Cross-Source Selector Schema
export type {
  CollectionDataSource,
  SliceDataSource,
  SelectorDataSource,
  DataSource,
  SelectorInput as CrossSelectorInput,
  FilterPredicate,
  FieldMapping,
  TransformOperation,
  Aggregation,
  OutputType,
  MemoizationConfig,
  CrossSourceSelector,
  SelectorsConfig,
} from "./selector-schema";

export {
  DataSourceSchema,
  SelectorInputSchema,
  FilterPredicateSchema,
  TransformOperationSchema,
  AggregationSchema,
  OutputTypeSchema,
  MemoizationConfigSchema,
  CrossSourceSelectorSchema,
  SelectorsConfigSchema,
  createCrossSourceSelector,
  fromCollection,
  fromSlice,
  fromSelector,
  filterOp,
  sortOp,
  groupByOp,
  countOutput,
  sumOutput,
  arrayOutput,
  singleOutput,
} from "./selector-schema";
