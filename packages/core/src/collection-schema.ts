import { z } from "zod";

/**
 * Query operators for filtering in live queries
 */
export const QueryOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
  "contains",
  "startsWith",
  "endsWith",
  "isNull",
  "isNotNull",
]);

export type QueryOperator = z.infer<typeof QueryOperatorSchema>;

/**
 * Reference to a value from local state (RTK slice)
 */
export const StateReferenceSchema = z.object({
  slice: z.string(),
  selector: z.string(),
});

export type StateReference = z.infer<typeof StateReferenceSchema>;

/**
 * Filter condition for live queries
 */
export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: QueryOperatorSchema,
  value: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.unknown()),
      z.null(),
    ])
    .optional(),
  // For dynamic values from local state
  valueFrom: StateReferenceSchema.optional(),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * Sort definition for ordering results
 */
export const SortDefinitionSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});

export type SortDefinition = z.infer<typeof SortDefinitionSchema>;

/**
 * Join definition for combining collections
 */
export const JoinDefinitionSchema = z.object({
  type: z.enum(["inner", "left", "right"]),
  on: z.object({
    left: z.string(), // alias.field
    right: z.string(), // alias.field
  }),
});

export type JoinDefinition = z.infer<typeof JoinDefinitionSchema>;

/**
 * Collection source in a query (single or multiple with alias)
 */
export const CollectionSourceSchema = z.union([
  z.string(), // Single collection name
  z.array(
    z.object({
      collection: z.string(),
      alias: z.string().optional(),
    }),
  ),
]);

export type CollectionSource = z.infer<typeof CollectionSourceSchema>;

/**
 * Field selection (simple or renamed)
 */
export const FieldSelectionSchema = z.union([
  z.string(), // Simple field name
  z.object({
    field: z.string(),
    as: z.string(), // Renamed field
  }),
]);

export type FieldSelection = z.infer<typeof FieldSelectionSchema>;

/**
 * Live Query definition
 */
export const LiveQuerySchema = z.object({
  name: z.string(),
  description: z.string(),
  from: CollectionSourceSchema,
  joins: z.array(JoinDefinitionSchema).optional(),
  where: z.array(FilterConditionSchema).optional(),
  select: z.array(FieldSelectionSchema).optional(),
  orderBy: z.array(SortDefinitionSchema).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type LiveQuery = z.infer<typeof LiveQuerySchema>;

/**
 * Data source type for collections
 */
export const QuerySourceSchema = z.object({
  type: z.literal("query"),
  endpoint: z.string(),
  queryKey: z.array(z.string()),
  refetchInterval: z.number().optional(),
});

export const ElectricSourceSchema = z.object({
  type: z.literal("electric"),
  table: z.string(),
  where: z.string().optional(),
});

export const LocalStorageSourceSchema = z.object({
  type: z.literal("localStorage"),
  key: z.string(),
});

export const CollectionSourceTypeSchema = z.discriminatedUnion("type", [
  QuerySourceSchema,
  ElectricSourceSchema,
  LocalStorageSourceSchema,
]);

export type CollectionSourceType = z.infer<typeof CollectionSourceTypeSchema>;

/**
 * Collection definition
 */
export const CollectionDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.string(), // Reference to TableSchema name
  source: CollectionSourceTypeSchema,
  liveQueries: z.array(LiveQuerySchema).optional(),
});

export type CollectionDefinition = z.infer<typeof CollectionDefinitionSchema>;

/**
 * Side effects after mutation
 */
export const MutationSideEffectsSchema = z.object({
  invalidate: z.array(z.string()).optional(), // Query keys to invalidate
  refetch: z.array(z.string()).optional(), // Collections to refetch
});

export type MutationSideEffects = z.infer<typeof MutationSideEffectsSchema>;

/**
 * Validation rule for mutation
 */
export const MutationValidationSchema = z.object({
  field: z.string(),
  rule: z.string(), // Reference to validation rule
});

export type MutationValidation = z.infer<typeof MutationValidationSchema>;

/**
 * Optimistic mutation definition
 */
export const MutationDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  type: z.enum(["insert", "update", "delete"]),
  endpoint: z.string(),
  method: z.enum(["POST", "PUT", "PATCH", "DELETE"]),
  optimistic: z.boolean().default(true),
  validate: z.array(MutationValidationSchema).optional(),
  onSuccess: MutationSideEffectsSchema.optional(),
});

export type MutationDefinition = z.infer<typeof MutationDefinitionSchema>;

/**
 * Complete TanStack DB configuration
 */
export const TanStackDBConfigSchema = z.object({
  collections: z.array(CollectionDefinitionSchema),
  mutations: z.array(MutationDefinitionSchema).optional(),
  globalQueries: z.array(LiveQuerySchema).optional(),
});

export type TanStackDBConfig = z.infer<typeof TanStackDBConfigSchema>;

/**
 * Helper to create a simple query collection config
 */
export function createQueryCollection(config: {
  name: string;
  description: string;
  schema: string;
  endpoint: string;
  queryKey?: string[];
  refetchInterval?: number;
  liveQueries?: LiveQuery[];
}): CollectionDefinition {
  return {
    name: config.name,
    description: config.description,
    schema: config.schema,
    source: {
      type: "query",
      endpoint: config.endpoint,
      queryKey: config.queryKey || [config.name],
      refetchInterval: config.refetchInterval,
    },
    liveQueries: config.liveQueries,
  };
}

/**
 * Helper to create a live query definition
 */
export function createLiveQuery(config: {
  name: string;
  description: string;
  from: string;
  where?: FilterCondition[];
  select?: FieldSelection[];
  orderBy?: SortDefinition[];
  limit?: number;
}): LiveQuery {
  return {
    name: config.name,
    description: config.description,
    from: config.from,
    where: config.where,
    select: config.select,
    orderBy: config.orderBy,
    limit: config.limit,
  };
}

/**
 * Helper to create a mutation definition
 */
export function createMutation(config: {
  name: string;
  description: string;
  collection: string;
  type: "insert" | "update" | "delete";
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  optimistic?: boolean;
}): MutationDefinition {
  const methodMap = {
    insert: "POST" as const,
    update: "PUT" as const,
    delete: "DELETE" as const,
  };

  return {
    name: config.name,
    description: config.description,
    collection: config.collection,
    type: config.type,
    endpoint: config.endpoint,
    method: config.method || methodMap[config.type],
    optimistic: config.optimistic ?? true,
  };
}
