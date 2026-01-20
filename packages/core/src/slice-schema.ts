import { z } from "zod";

/**
 * Primitive types that AI can use for slice state
 */
export const StateValueTypeSchema = z.union([
  z.literal("string"),
  z.literal("number"),
  z.literal("boolean"),
  z.literal("string[]"),
  z.literal("number[]"),
  z.object({ arrayOf: z.string() }), // Array of entity type
  z.object({ record: z.tuple([z.string(), z.string()]) }), // Record<K, V>
  z.object({ nullable: z.string() }), // Nullable type
]);

export type StateValueType = z.infer<typeof StateValueTypeSchema>;

/**
 * Single field in slice state
 */
export const StateFieldSchema = z.object({
  name: z.string(),
  type: StateValueTypeSchema,
  default: z.unknown().optional(),
  description: z.string().optional(),
});

export type StateField = z.infer<typeof StateFieldSchema>;

/**
 * Payload definition for reducers/thunks
 */
export const PayloadSchema = z.object({
  type: StateValueTypeSchema.optional(),
  fields: z
    .array(
      z.object({
        name: z.string(),
        type: StateValueTypeSchema,
        optional: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type Payload = z.infer<typeof PayloadSchema>;

/**
 * Reducer action definition
 */
export const ReducerSchema = z.object({
  name: z.string(),
  description: z.string(),
  payload: PayloadSchema.optional(),
  modifies: z.array(z.string()), // State fields this reducer modifies
});

export type Reducer = z.infer<typeof ReducerSchema>;

/**
 * Async thunk definition
 */
export const ThunkSchema = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  payload: PayloadSchema.optional(),
  onPending: z.array(z.string()).optional(),
  onFulfilled: z.array(z.string()).optional(),
  onRejected: z.array(z.string()).optional(),
});

export type Thunk = z.infer<typeof ThunkSchema>;

/**
 * Simple selector - direct path access
 */
export const SimpleSelectorSchema = z.object({
  type: z.literal("simple").optional().default("simple"),
  name: z.string(),
  description: z.string(),
  path: z.string(),
});

export type SimpleSelector = z.infer<typeof SimpleSelectorSchema>;

/**
 * Input selector reference
 */
export const SelectorInputSchema = z.object({
  selector: z.string(), // Selector name
  slice: z.string().optional(), // If from another slice
});

export type SelectorInput = z.infer<typeof SelectorInputSchema>;

/**
 * Computation operations for derived selectors
 */
export const ComputationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("filter"), predicate: z.string() }),
  z.object({ op: z.literal("map"), mapper: z.string() }),
  z.object({ op: z.literal("find"), predicate: z.string() }),
  z.object({ op: z.literal("sort"), comparator: z.string() }),
  z.object({ op: z.literal("count") }),
  z.object({ op: z.literal("sum"), field: z.string() }),
  z.object({ op: z.literal("groupBy"), field: z.string() }),
  z.object({ op: z.literal("combine"), combiner: z.string() }),
  z.object({ op: z.literal("identity") }),
]);

export type Computation = z.infer<typeof ComputationSchema>;

/**
 * Derived selector - computed from other selectors
 */
export const DerivedSelectorSchema = z.object({
  type: z.literal("derived"),
  name: z.string(),
  description: z.string(),
  inputs: z.array(SelectorInputSchema),
  computation: ComputationSchema,
});

export type DerivedSelector = z.infer<typeof DerivedSelectorSchema>;

/**
 * Parameter definition for parameterized selectors
 */
export const SelectorParamSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean"]),
});

export type SelectorParam = z.infer<typeof SelectorParamSchema>;

/**
 * Parameterized computation
 */
export const ParameterizedComputationSchema = z.object({
  op: z.enum(["filter", "find", "includes"]),
  expression: z.string(), // JS expression using params
});

export type ParameterizedComputation = z.infer<
  typeof ParameterizedComputationSchema
>;

/**
 * Parameterized selector - factory function
 */
export const ParameterizedSelectorSchema = z.object({
  type: z.literal("parameterized"),
  name: z.string(),
  description: z.string(),
  params: z.array(SelectorParamSchema),
  baseSelector: z.string(),
  computation: ParameterizedComputationSchema,
});

export type ParameterizedSelector = z.infer<typeof ParameterizedSelectorSchema>;

/**
 * Union of all selector types
 */
export const SelectorSchema = z.union([
  SimpleSelectorSchema.extend({ type: z.literal("simple") }),
  DerivedSelectorSchema,
  ParameterizedSelectorSchema,
  SimpleSelectorSchema, // Allow simple without type field
]);

export type Selector = z.infer<typeof SelectorSchema>;

/**
 * Complete slice definition
 */
export const SliceDefinitionSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/), // camelCase
  description: z.string(),
  initialState: z.array(StateFieldSchema),
  reducers: z.array(ReducerSchema).optional(),
  thunks: z.array(ThunkSchema).optional(),
  selectors: z.array(SelectorSchema).optional(),
});

export type SliceDefinition = z.infer<typeof SliceDefinitionSchema>;

/**
 * Collection of slices
 */
export const SliceCollectionSchema = z.object({
  slices: z.array(SliceDefinitionSchema),
});

export type SliceCollection = z.infer<typeof SliceCollectionSchema>;

/**
 * Helper to map state value type to TypeScript
 */
export function mapStateTypeToTS(type: StateValueType): string {
  if (typeof type === "string") {
    const map: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      "string[]": "string[]",
      "number[]": "number[]",
    };
    return map[type] || "unknown";
  }
  if (typeof type === "object") {
    if ("arrayOf" in type) return `${type.arrayOf}[]`;
    if ("record" in type) return `Record<${type.record[0]}, ${type.record[1]}>`;
    if ("nullable" in type) return `${type.nullable} | null`;
  }
  return "unknown";
}

/**
 * Helper to get default value for a state type
 */
export function getDefaultForStateType(type: StateValueType): unknown {
  if (typeof type === "string") {
    const map: Record<string, unknown> = {
      string: "",
      number: 0,
      boolean: false,
      "string[]": [],
      "number[]": [],
    };
    return map[type];
  }
  if (typeof type === "object") {
    if ("arrayOf" in type) return [];
    if ("record" in type) return {};
    if ("nullable" in type) return null;
  }
  return null;
}

/**
 * Helper to create a slice definition
 */
export function createSlice(config: {
  name: string;
  description: string;
  initialState: StateField[];
  reducers?: Reducer[];
  thunks?: Thunk[];
  selectors?: Selector[];
}): SliceDefinition {
  return {
    name: config.name,
    description: config.description,
    initialState: config.initialState,
    reducers: config.reducers,
    thunks: config.thunks,
    selectors: config.selectors,
  };
}

/**
 * Helper to create a simple selector
 */
export function simpleSelector(
  name: string,
  path: string,
  description: string,
): SimpleSelector {
  return {
    type: "simple",
    name,
    path,
    description,
  };
}

/**
 * Helper to create a derived selector
 */
export function derivedSelector(config: {
  name: string;
  description: string;
  inputs: SelectorInput[];
  computation: Computation;
}): DerivedSelector {
  return {
    type: "derived",
    ...config,
  };
}

/**
 * Helper to create a parameterized selector
 */
export function parameterizedSelector(config: {
  name: string;
  description: string;
  params: SelectorParam[];
  baseSelector: string;
  computation: ParameterizedComputation;
}): ParameterizedSelector {
  return {
    type: "parameterized",
    ...config,
  };
}
