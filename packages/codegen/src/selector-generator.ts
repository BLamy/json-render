import type {
  CrossSourceSelector,
  CrossSelectorInput,
  TransformOperation,
  OutputType,
  Aggregation,
  FilterPredicate,
  FieldMapping,
  DataSource,
} from "@json-render/core";

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Map comparison operator to JavaScript
 */
function operatorToJS(op: string): string {
  const map: Record<string, string> = {
    eq: "===",
    neq: "!==",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    in: "", // Handled specially
    contains: "", // Handled specially
  };
  return map[op] || "===";
}

/**
 * Generate filter expression from predicate
 */
function generateFilterExpression(predicate: FilterPredicate): string {
  const { field, operator, value, valueFrom } = predicate;
  const valueExpr = valueFrom ? valueFrom.selector : JSON.stringify(value);

  if (operator === "in") {
    return `${valueExpr}.includes(item.${field})`;
  }
  if (operator === "contains") {
    return `item.${field}.includes(${valueExpr})`;
  }

  return `item.${field} ${operatorToJS(operator)} ${valueExpr}`;
}

/**
 * Generate computed field code
 */
function generateComputedField(field: FieldMapping): string {
  if (typeof field === "string") {
    return field;
  }
  if ("from" in field && "to" in field) {
    return `${field.to}: item.${field.from}`;
  }
  if ("compute" in field) {
    switch (field.compute) {
      case "concat":
        return `${field.name}: [${field.args.map((a) => `item.${a}`).join(", ")}].join(" ")`;
      case "sum":
        return `${field.name}: ${field.args.map((a) => `item.${a}`).join(" + ")}`;
      case "multiply":
        return `${field.name}: ${field.args.map((a) => `item.${a}`).join(" * ")}`;
      case "format":
        return `${field.name}: String(item.${field.args[0]})`;
      default:
        return `${field.name}: item.${field.args[0]}`;
    }
  }
  return "";
}

/**
 * Apply transformation operation to input
 */
function applyTransformation(input: string, op: TransformOperation): string {
  switch (op.op) {
    case "filter":
      return `${input}.filter(item => ${generateFilterExpression(op.predicate)})`;

    case "map":
      const fields = op.fields
        .map((f) => generateComputedField(f))
        .filter(Boolean);
      return `${input}.map(item => ({ ${fields.join(", ")} }))`;

    case "sort":
      const dir = op.direction === "desc" ? -1 : 1;
      return `[...${input}].sort((a, b) => (a.${op.field} > b.${op.field} ? ${dir} : ${-dir}))`;

    case "slice":
      return `${input}.slice(${op.start ?? 0}${op.end ? `, ${op.end}` : ""})`;

    case "groupBy":
      return `Object.groupBy(${input}, item => item.${op.field})`;

    case "unique":
      if (op.field) {
        return `[...new Map(${input}.map(item => [item.${op.field}, item])).values()]`;
      }
      return `[...new Set(${input})]`;

    default:
      return input;
  }
}

/**
 * Apply aggregation operation
 */
function applyAggregation(input: string, agg: Aggregation): string {
  switch (agg.type) {
    case "count":
      return `${input}.length`;
    case "sum":
      return `${input}.reduce((acc, item) => acc + (item.${agg.field} ?? 0), 0)`;
    case "avg":
      return `${input}.length > 0 ? ${input}.reduce((acc, item) => acc + (item.${agg.field} ?? 0), 0) / ${input}.length : 0`;
    case "min":
      return `Math.min(...${input}.map(item => item.${agg.field}))`;
    case "max":
      return `Math.max(...${input}.map(item => item.${agg.field}))`;
    case "first":
      return `${input}[0] ?? null`;
    case "last":
      return `${input}[${input}.length - 1] ?? null`;
    case "reduce":
      return `${input}.reduce(${agg.reducer}, ${JSON.stringify(agg.initial)})`;
    default:
      return input;
  }
}

/**
 * Apply output transformation
 */
function applyOutputTransform(input: string, output: OutputType): string {
  switch (output.type) {
    case "array":
      return `return ${input};`;
    case "single":
      return `return ${input}[0] ?? null;`;
    case "aggregation":
      return `return ${applyAggregation(input, output.aggregation)};`;
    case "object":
      const fields = Object.entries(output.fields)
        .map(
          ([key, agg]) =>
            `${key}: ${applyAggregation(input, agg as Aggregation)}`,
        )
        .join(",\n      ");
      return `return {\n      ${fields}\n    };`;
    default:
      return `return ${input};`;
  }
}

/**
 * Generate input hook for a data source
 */
function generateInputHook(input: CrossSelectorInput): string {
  const { name, source } = input;

  switch (source.type) {
    case "slice":
      return `const ${name} = useAppSelector(state => state.${source.slice}.${source.path});`;

    case "collection":
      if (source.query) {
        return `const { data: ${name} = [] } = useLiveQuery(${source.collection}Collection.queries.${source.query});`;
      }
      return `const { data: ${name} = [] } = useLiveQuery((q) => q.from({ items: ${source.collection}Collection }));`;

    case "selector":
      return `const ${name} = use${source.selector.replace(/^select/, "")}();`;

    default:
      return `const ${name} = null; // Unknown source type`;
  }
}

/**
 * Generate imports for a selector
 */
function generateSelectorImports(inputs: CrossSelectorInput[]): string {
  const sliceImports = new Set<string>();
  const collectionImports = new Set<string>();
  const selectorImports = new Set<string>();

  for (const input of inputs) {
    switch (input.source.type) {
      case "slice":
        sliceImports.add(input.source.slice);
        break;
      case "collection":
        collectionImports.add(input.source.collection);
        break;
      case "selector":
        selectorImports.add(input.source.selector);
        break;
    }
  }

  const lines: string[] = [];

  if (collectionImports.size > 0) {
    for (const collection of collectionImports) {
      lines.push(
        `import { ${collection}Collection } from "../db/collections/${collection}Collection";`,
      );
    }
  }

  if (selectorImports.size > 0) {
    const hooks = Array.from(selectorImports).map(
      (s) => `use${s.replace(/^select/, "")}`,
    );
    lines.push(`import { ${hooks.join(", ")} } from "./index";`);
  }

  return lines.join("\n");
}

/**
 * Generate selector body code
 */
function generateSelectorBody(
  inputs: CrossSelectorInput[],
  pipeline: TransformOperation[] | undefined,
  output: OutputType,
): string {
  const firstInput = inputs[0];
  let result = firstInput?.name ?? "data";

  // Apply pipeline transformations
  if (pipeline) {
    for (const op of pipeline) {
      result = applyTransformation(result, op);
    }
  }

  // Apply output transformation
  return applyOutputTransform(result, output);
}

/**
 * Check if selector only uses slice sources
 */
function hasOnlySliceSources(inputs: CrossSelectorInput[]): boolean {
  return inputs.every((i) => i.source.type === "slice");
}

/**
 * Generate RTK-only selector (using createSelector)
 */
function generateRTKSelector(selector: CrossSourceSelector): string {
  const { name, description, inputs, pipeline, output } = selector;

  const inputSelectors = inputs
    .map((i) => {
      const source = i.source as { type: "slice"; slice: string; path: string };
      return `(state: RootState) => state.${source.slice}.${source.path}`;
    })
    .join(",\n    ");

  const body = generateSelectorBody(inputs, pipeline, output);

  return `
/**
 * ${description}
 */
export const ${name} = createSelector(
  [
    ${inputSelectors}
  ],
  (${inputs.map((i) => i.name).join(", ")}) => {
    ${body}
  }
);`;
}

/**
 * Generate React hook selector (for mixed sources)
 */
function generateHookSelector(selector: CrossSourceSelector): string {
  const { name, description, inputs, pipeline, output } = selector;
  const hookName = `use${name.replace(/^select/, "")}`;

  const inputHooks = inputs.map((i) => generateInputHook(i)).join("\n  ");
  const body = generateSelectorBody(inputs, pipeline, output);

  return `
/**
 * ${description}
 */
export function ${hookName}() {
  ${inputHooks}

  return useMemo(() => {
    ${body}
  }, [${inputs.map((i) => i.name).join(", ")}]);
}`;
}

/**
 * Generate cross-source selector code
 */
export function generateCrossSourceSelectorCode(
  selector: CrossSourceSelector,
): string {
  const { inputs, memoize } = selector;
  const memoized = memoize?.enabled !== false;

  // Generate imports
  const imports = generateSelectorImports(inputs);

  // Determine if we can use createSelector (RTK-only) or need a hook
  if (hasOnlySliceSources(inputs)) {
    return `${imports}
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

${generateRTKSelector(selector)}
`;
  }

  // Use React hook for mixed sources
  return `${imports}
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";

${generateHookSelector(selector)}
`;
}

/**
 * Generate selectors index file
 */
export function generateSelectorsIndexCode(
  selectors: CrossSourceSelector[],
): string {
  const exports = selectors.map((s) => {
    const hookName = `use${s.name.replace(/^select/, "")}`;
    if (hasOnlySliceSources(s.inputs)) {
      return `export { ${s.name} } from "./${s.name}";`;
    }
    return `export { ${hookName} } from "./${s.name}";`;
  });

  return `// Cross-source selectors
${exports.join("\n")}
`;
}

/**
 * Generate all selector files for a project
 */
export function generateSelectorFiles(
  selectors: CrossSourceSelector[],
): Record<string, string> {
  const files: Record<string, string> = {};

  for (const selector of selectors) {
    files[`selectors/${selector.name}.ts`] =
      generateCrossSourceSelectorCode(selector);
  }

  files["selectors/index.ts"] = generateSelectorsIndexCode(selectors);

  return files;
}
