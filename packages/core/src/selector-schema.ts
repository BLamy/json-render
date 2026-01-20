import { z } from "zod";

/**
 * Data source from TanStack DB collection
 */
export const CollectionSourceSchema = z.object({
  type: z.literal("collection"),
  collection: z.string(),
  query: z.string().optional(), // Live query name
});

export type CollectionDataSource = z.infer<typeof CollectionSourceSchema>;

/**
 * Data source from RTK slice
 */
export const SliceSourceSchema = z.object({
  type: z.literal("slice"),
  slice: z.string(),
  path: z.string(),
});

export type SliceDataSource = z.infer<typeof SliceSourceSchema>;

/**
 * Data source from another selector (composition)
 */
export const SelectorSourceSchema = z.object({
  type: z.literal("selector"),
  selector: z.string(),
});

export type SelectorDataSource = z.infer<typeof SelectorSourceSchema>;

/**
 * Union of all data sources
 */
export const DataSourceSchema = z.discriminatedUnion("type", [
  CollectionSourceSchema,
  SliceSourceSchema,
  SelectorSourceSchema,
]);

export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Input definition for a selector
 */
export const SelectorInputSchema = z.object({
  name: z.string(), // Local variable name
  source: DataSourceSchema,
});

export type SelectorInput = z.infer<typeof SelectorInputSchema>;

/**
 * Filter predicate for transform operations
 */
export const FilterPredicateSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
  value: z.unknown().optional(),
  valueFrom: z.object({ selector: z.string() }).optional(),
});

export type FilterPredicate = z.infer<typeof FilterPredicateSchema>;

/**
 * Field mapping for map operations
 */
export const FieldMappingSchema = z.union([
  z.string(), // Keep field as-is
  z.object({ from: z.string(), to: z.string() }), // Rename
  z.object({
    name: z.string(),
    compute: z.enum(["concat", "sum", "multiply", "format"]),
    args: z.array(z.string()),
  }),
]);

export type FieldMapping = z.infer<typeof FieldMappingSchema>;

/**
 * Transform operations for pipeline
 */
export const TransformOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("filter"),
    predicate: FilterPredicateSchema,
  }),
  z.object({
    op: z.literal("map"),
    fields: z.array(FieldMappingSchema),
  }),
  z.object({
    op: z.literal("sort"),
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }),
  z.object({
    op: z.literal("slice"),
    start: z.number().optional(),
    end: z.number().optional(),
  }),
  z.object({
    op: z.literal("groupBy"),
    field: z.string(),
  }),
  z.object({
    op: z.literal("unique"),
    field: z.string().optional(),
  }),
]);

export type TransformOperation = z.infer<typeof TransformOperationSchema>;

/**
 * Aggregation operations
 */
export const AggregationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("count") }),
  z.object({ type: z.literal("sum"), field: z.string() }),
  z.object({ type: z.literal("avg"), field: z.string() }),
  z.object({ type: z.literal("min"), field: z.string() }),
  z.object({ type: z.literal("max"), field: z.string() }),
  z.object({ type: z.literal("first") }),
  z.object({ type: z.literal("last") }),
  z.object({
    type: z.literal("reduce"),
    initial: z.unknown(),
    reducer: z.string(), // Function name
  }),
]);

export type Aggregation = z.infer<typeof AggregationSchema>;

/**
 * Output type for selectors
 */
export const OutputTypeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("array") }),
  z.object({ type: z.literal("single") }),
  z.object({ type: z.literal("aggregation"), aggregation: AggregationSchema }),
  z.object({
    type: z.literal("object"),
    fields: z.record(z.string(), AggregationSchema),
  }),
]);

export type OutputType = z.infer<typeof OutputTypeSchema>;

/**
 * Memoization configuration
 */
export const MemoizationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxSize: z.number().optional(), // LRU cache size
  equalityFn: z.enum(["shallow", "deep", "reference"]).optional(),
});

export type MemoizationConfig = z.infer<typeof MemoizationConfigSchema>;

/**
 * Complete cross-source selector definition
 */
export const CrossSourceSelectorSchema = z.object({
  name: z.string().regex(/^select[A-Z][a-zA-Z0-9]*$/), // selectXxx naming
  description: z.string(),
  inputs: z.array(SelectorInputSchema),
  pipeline: z.array(TransformOperationSchema).optional(),
  output: OutputTypeSchema,
  memoize: MemoizationConfigSchema.optional(),
});

export type CrossSourceSelector = z.infer<typeof CrossSourceSelectorSchema>;

/**
 * Collection of cross-source selectors
 */
export const SelectorsConfigSchema = z.object({
  selectors: z.array(CrossSourceSelectorSchema),
});

export type SelectorsConfig = z.infer<typeof SelectorsConfigSchema>;

/**
 * Helper to create a cross-source selector
 */
export function createCrossSourceSelector(config: {
  name: string;
  description: string;
  inputs: SelectorInput[];
  pipeline?: TransformOperation[];
  output: OutputType;
  memoize?: MemoizationConfig;
}): CrossSourceSelector {
  return config as CrossSourceSelector;
}

/**
 * Helper to create input from collection
 */
export function fromCollection(
  name: string,
  collection: string,
  query?: string,
): SelectorInput {
  return {
    name,
    source: {
      type: "collection",
      collection,
      query,
    },
  };
}

/**
 * Helper to create input from slice
 */
export function fromSlice(
  name: string,
  slice: string,
  path: string,
): SelectorInput {
  return {
    name,
    source: {
      type: "slice",
      slice,
      path,
    },
  };
}

/**
 * Helper to create input from another selector
 */
export function fromSelector(name: string, selector: string): SelectorInput {
  return {
    name,
    source: {
      type: "selector",
      selector,
    },
  };
}

/**
 * Helper to create filter operation
 */
export function filterOp(predicate: FilterPredicate): TransformOperation {
  return { op: "filter", predicate };
}

/**
 * Helper to create sort operation
 */
export function sortOp(
  field: string,
  direction: "asc" | "desc" = "asc",
): TransformOperation {
  return { op: "sort", field, direction };
}

/**
 * Helper to create group by operation
 */
export function groupByOp(field: string): TransformOperation {
  return { op: "groupBy", field };
}

/**
 * Helper for count aggregation output
 */
export function countOutput(): OutputType {
  return { type: "aggregation", aggregation: { type: "count" } };
}

/**
 * Helper for sum aggregation output
 */
export function sumOutput(field: string): OutputType {
  return { type: "aggregation", aggregation: { type: "sum", field } };
}

/**
 * Helper for array output
 */
export function arrayOutput(): OutputType {
  return { type: "array" };
}

/**
 * Helper for single item output
 */
export function singleOutput(): OutputType {
  return { type: "single" };
}
