import type {
  CollectionDefinition,
  LiveQuery,
  MutationDefinition,
  TableSchema,
  FilterCondition,
} from "@json-render/core";

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate collection source configuration code
 */
function generateSourceConfig(
  name: string,
  source: CollectionDefinition["source"],
  schemaName: string,
  primaryKey: string,
): string {
  switch (source.type) {
    case "query":
      return `const collection = createCollection<${schemaName}>(
  queryCollectionOptions({
    id: "${name}",
    queryKey: ${JSON.stringify(source.queryKey)},
    queryFn: async () => {
      const response = await fetch("${source.endpoint}");
      if (!response.ok) throw new Error("Failed to fetch ${name}");
      return response.json();
    },
    getKey: (item) => item.${primaryKey},
    schema: ${schemaName}Schema,
    queryClient,${source.refetchInterval ? `\n    refetchInterval: ${source.refetchInterval},` : ""}
  })
);`;

    case "electric":
      return `import { electricCollectionOptions } from "@tanstack/electric-db-collection";

const collection = createCollection<${schemaName}>(
  electricCollectionOptions({
    id: "${name}",
    table: "${source.table}",${source.where ? `\n    where: "${source.where}",` : ""}
    getKey: (item) => item.${primaryKey},
    schema: ${schemaName}Schema,
  })
);`;

    case "localStorage":
      return `import { localStorageCollectionOptions } from "@tanstack/db";

const collection = createCollection<${schemaName}>(
  localStorageCollectionOptions({
    id: "${name}",
    key: "${source.key}",
    getKey: (item) => item.${primaryKey},
    schema: ${schemaName}Schema,
  })
);`;

    default:
      return `const collection = createCollection({ id: "${name}" });`;
  }
}

/**
 * Map query operator to TanStack DB function
 */
function mapOperator(operator: string): string {
  const map: Record<string, string> = {
    eq: "eq",
    neq: "neq",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
    in: "inArray",
    notIn: "notInArray",
    contains: "like",
    startsWith: "like",
    endsWith: "like",
    isNull: "isNull",
    isNotNull: "isNotNull",
  };
  return map[operator] || "eq";
}

/**
 * Generate live query export code
 */
function generateLiveQueryExport(
  collectionName: string,
  query: LiveQuery,
): string {
  const { name, description, where, select, orderBy, limit } = query;

  let queryBuilder = `(q) => q.from({ items: collection })`;

  // Add where clauses
  if (where && where.length > 0) {
    const conditions = where
      .map((w: FilterCondition) => {
        const value = w.valueFrom
          ? `/* dynamic: ${w.valueFrom.slice}.${w.valueFrom.selector} */`
          : JSON.stringify(w.value);
        return `.where(({ items }) => ${mapOperator(w.operator)}(items.${w.field}, ${value}))`;
      })
      .join("\n    ");
    queryBuilder += `\n    ${conditions}`;
  }

  // Add select clause
  if (select && select.length > 0) {
    const fields = select
      .map((s) =>
        typeof s === "string"
          ? `${s}: items.${s}`
          : `${s.as}: items.${s.field}`,
      )
      .join(", ");
    queryBuilder += `\n    .select(({ items }) => ({ ${fields} }))`;
  }

  // Add orderBy clause
  if (orderBy && orderBy.length > 0) {
    const sorts = orderBy.map((s) => `items.${s.field}`).join(", ");
    queryBuilder += `\n    .orderBy(({ items }) => [${sorts}])`;
  }

  // Add limit
  if (limit) {
    queryBuilder += `\n    .limit(${limit})`;
  }

  return `
// Live Query: ${description}
export const ${name}Query = ${queryBuilder};`;
}

/**
 * Generate TanStack DB collection code
 */
export function generateCollectionCode(
  collectionDef: CollectionDefinition,
  tableSchema: TableSchema,
): string {
  const { name, source, liveQueries } = collectionDef;
  const schemaName = tableSchema.name;
  const primaryKey = tableSchema.primaryKey || "id";

  const sourceConfig = generateSourceConfig(
    name,
    source,
    schemaName,
    primaryKey,
  );
  const liveQueryExports =
    liveQueries?.map((q) => generateLiveQueryExport(name, q)).join("\n") || "";
  const queryNames =
    liveQueries?.map((q) => `${q.name}: ${q.name}Query`).join(",\n    ") || "";

  return `import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { eq, neq, gt, gte, lt, lte, inArray, like, isNull, isNotNull } from "@tanstack/db";
import { ${schemaName}Schema, type ${schemaName} } from "../schemas/${schemaName}Schema";
import { queryClient } from "../queryClient";

${sourceConfig}

${liveQueryExports}

// Export collection with queries namespace
export const ${name}Collection = Object.assign(collection, {
  queries: {
    ${queryNames}
  }
});
`;
}

/**
 * Generate optimistic update code based on mutation type
 */
function generateOptimisticUpdate(type: string, collection: string): string {
  switch (type) {
    case "insert":
      return `${collection}Collection.insert({ ...payload, id: crypto.randomUUID() });`;
    case "update":
      return `${collection}Collection.update(payload.id, (draft) => Object.assign(draft, payload));`;
    case "delete":
      return `${collection}Collection.delete(payload.id);`;
    default:
      return "// Custom mutation";
  }
}

/**
 * Generate mutation code
 */
export function generateMutationCode(mutation: MutationDefinition): string {
  const { name, description, collection, type, endpoint, method, optimistic } =
    mutation;

  return `import { createOptimisticAction } from "@tanstack/db";
import { ${collection}Collection } from "../collections/${collection}Collection";

/**
 * ${description}
 */
export const ${name} = createOptimisticAction({
  ${
    optimistic
      ? `onMutate: (payload) => {
    ${generateOptimisticUpdate(type, collection)}
  },`
      : ""
  }
  mutationFn: async (payload) => {
    const response = await fetch("${endpoint}", {
      method: "${method}",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("${name} failed");
    const result = await response.json();
    ${optimistic ? `await ${collection}Collection.utils.refetch();` : ""}
    return result;
  },
});
`;
}

/**
 * Generate TanStack Query client setup code
 */
export function generateQueryClientCode(): string {
  return `import { QueryClient } from "@tanstack/query-core";

// Global query client for TanStack DB
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});
`;
}

/**
 * Generate TanStack DB setup/index file
 */
export function generateDBSetupCode(
  collections: CollectionDefinition[],
): string {
  const exports = collections
    .map(
      (c) =>
        `export { ${c.name}Collection } from "./collections/${c.name}Collection";`,
    )
    .join("\n");

  return `export { queryClient } from "./queryClient";

// Re-export all collections
${exports}
`;
}

/**
 * Generate TanStack providers component
 */
export function generateDBProvidersCode(): string {
  return `"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export function DBProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
`;
}

/**
 * Generate all TanStack DB files for a project
 */
export function generateTanStackDBFiles(
  collections: CollectionDefinition[],
  mutations: MutationDefinition[],
  tableSchemas: Record<string, TableSchema>,
): Record<string, string> {
  const files: Record<string, string> = {};

  // Generate query client
  files["db/queryClient.ts"] = generateQueryClientCode();

  // Generate collections
  for (const collection of collections) {
    const schema = tableSchemas[collection.schema];
    if (schema) {
      files[`db/collections/${collection.name}Collection.ts`] =
        generateCollectionCode(collection, schema);
    }
  }

  // Generate mutations
  for (const mutation of mutations) {
    files[`db/mutations/${mutation.name}.ts`] = generateMutationCode(mutation);
  }

  // Generate index
  files["db/index.ts"] = generateDBSetupCode(collections);

  // Generate provider
  files["db/provider.tsx"] = generateDBProvidersCode();

  return files;
}
