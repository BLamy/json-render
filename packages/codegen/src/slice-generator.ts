import type {
  SliceDefinition,
  StateValueType,
  Selector,
  Computation,
  ParameterizedSelector,
} from "@json-render/core";

/**
 * Map state value type to TypeScript type string
 */
function mapTypeToTS(type: StateValueType): string {
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
 * Get default value for a state type
 */
function getDefaultForType(type: StateValueType): unknown {
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
 * Map payload to TypeScript type
 */
function mapPayloadToTS(payload: unknown): string {
  if (!payload) return "void";
  const p = payload as {
    type?: StateValueType;
    fields?: Array<{ name: string; type: StateValueType; optional?: boolean }>;
  };
  if (p.type) return mapTypeToTS(p.type);
  if (p.fields) {
    const fieldStrs = p.fields.map((f) => {
      const opt = f.optional ? "?" : "";
      return `${f.name}${opt}: ${mapTypeToTS(f.type)}`;
    });
    return `{ ${fieldStrs.join("; ")} }`;
  }
  return "unknown";
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate computation code for derived selectors
 */
function generateComputation(computation: Computation): string {
  switch (computation.op) {
    case "filter":
      return `return input0.filter(${computation.predicate});`;
    case "map":
      return `return input0.map(${computation.mapper});`;
    case "find":
      return `return input0.find(${computation.predicate}) ?? null;`;
    case "sort":
      return `return [...input0].sort(${computation.comparator});`;
    case "count":
      return `return input0.length;`;
    case "sum":
      return `return input0.reduce((acc, item) => acc + (item.${computation.field} ?? 0), 0);`;
    case "groupBy":
      return `return Object.groupBy(input0, item => item.${computation.field});`;
    case "combine":
      return `return (${computation.combiner})(input0, input1, input2, input3, input4);`;
    case "identity":
      return `return input0;`;
    default:
      return `return input0;`;
  }
}

/**
 * Generate parameterized computation code
 */
function generateParameterizedComputation(
  selector: ParameterizedSelector,
): string {
  const { computation } = selector;
  switch (computation.op) {
    case "filter":
      return `return items.filter(item => ${computation.expression});`;
    case "find":
      return `return items.find(item => ${computation.expression}) ?? null;`;
    case "includes":
      return `return items.some(item => ${computation.expression});`;
    default:
      return `return items;`;
  }
}

/**
 * Generate selector code from definition
 */
function generateSelectorFromDefinition(
  sliceName: string,
  selector: Selector,
): string {
  // Handle simple selectors (or those without explicit type)
  if (!("type" in selector) || selector.type === "simple") {
    const s = selector as { name: string; path: string; description: string };
    return `
// ${s.description}
export const ${s.name} = (state: RootState) => state.${sliceName}.${s.path};`;
  }

  // Handle derived selectors
  if (selector.type === "derived") {
    const inputSelectors = selector.inputs.map((i) => {
      if (i.slice && i.slice !== sliceName) {
        return `select${capitalize(i.slice)}${capitalize(i.selector.replace("select", ""))}`;
      }
      return i.selector;
    });

    const computation = generateComputation(selector.computation);

    return `
// ${selector.description}
export const ${selector.name} = createSelector(
  [${inputSelectors.join(", ")}],
  (${selector.inputs.map((_, i) => `input${i}`).join(", ")}) => {
    ${computation}
  }
);`;
  }

  // Handle parameterized selectors
  if (selector.type === "parameterized") {
    const params = selector.params
      .map((p) => `${p.name}: ${p.type}`)
      .join(", ");
    const computation = generateParameterizedComputation(selector);

    return `
// ${selector.description}
export const ${selector.name} = (${params}) => createSelector(
  [${selector.baseSelector}],
  (items) => {
    ${computation}
  }
);`;
  }

  return "";
}

/**
 * Get loading value for thunk state updates
 */
function getLoadingValue(field: string): string {
  if (field === "loading" || field === "isLoading") return "true";
  if (field === "error") return "null";
  return "/* set loading state */";
}

/**
 * Generate RTK slice code from a slice definition
 */
export function generateSliceCode(slice: SliceDefinition): string {
  const { name, description, initialState, reducers, thunks, selectors } =
    slice;
  const capitalName = capitalize(name);

  // Generate state interface
  const stateFields = initialState
    .map((f) => `  ${f.name}: ${mapTypeToTS(f.type)};`)
    .join("\n");

  // Generate initial state object
  const initialStateFields = initialState
    .map((f) => {
      const defaultVal =
        f.default !== undefined ? f.default : getDefaultForType(f.type);
      return `  ${f.name}: ${JSON.stringify(defaultVal)},`;
    })
    .join("\n");

  // Generate thunks
  const thunkCode =
    thunks
      ?.map(
        (thunk) => `
// Async Thunk: ${thunk.description}
export const ${thunk.name} = createAsyncThunk(
  "${name}/${thunk.name}",
  async (${thunk.payload ? `payload: ${mapPayloadToTS(thunk.payload)}` : "_"}, { rejectWithValue }) => {
    try {
      const response = await fetch("${thunk.endpoint || "/api/" + thunk.name}", {
        method: "${thunk.method || "GET"}",
        ${thunk.payload ? "body: JSON.stringify(payload)," : ""}
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Request failed");
      return response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);`,
      )
      .join("\n") || "";

  // Generate reducer code
  const reducerCode =
    reducers
      ?.map(
        (reducer) => `
    // ${reducer.description}
    ${reducer.name}: (state, action: PayloadAction<${mapPayloadToTS(reducer.payload)}>) => {
      ${reducer.modifies.map((field) => `// Modify state.${field}`).join("\n      ")}
    },`,
      )
      .join("") || "";

  // Generate extra reducers for thunks
  const extraReducersCode =
    thunks
      ?.map(
        (thunk) => `
    builder
      .addCase(${thunk.name}.pending, (state) => {
        ${thunk.onPending?.map((f) => `state.${f} = ${getLoadingValue(f)};`).join("\n        ") || "// pending"}
      })
      .addCase(${thunk.name}.fulfilled, (state, action) => {
        ${thunk.onFulfilled?.map((f) => `state.${f} = action.payload.${f} ?? state.${f};`).join("\n        ") || "// fulfilled"}
      })
      .addCase(${thunk.name}.rejected, (state, action) => {
        ${thunk.onRejected?.map((f) => `state.${f} = action.payload as string;`).join("\n        ") || "// rejected"}
      });`,
      )
      .join("") || "";

  // Generate selectors
  const selectorCode =
    selectors
      ?.map((selector) => generateSelectorFromDefinition(name, selector))
      .join("\n") || "";

  return `import { createSlice, createAsyncThunk, createSelector, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

/**
 * ${description}
 */

// Types
interface ${capitalName}State {
${stateFields}
}

// Initial State
const initialState: ${capitalName}State = {
${initialStateFields}
};

${thunkCode}

// Slice
export const ${name}Slice = createSlice({
  name: "${name}",
  initialState,
  reducers: {${reducerCode}
  },
  extraReducers: (builder) => {${extraReducersCode}
  },
});

// Actions
export const { ${reducers?.map((r) => r.name).join(", ") || ""} } = ${name}Slice.actions;

// Selectors
${selectorCode}

export default ${name}Slice.reducer;
`;
}

/**
 * Generate the Redux store configuration
 */
export function generateStoreCode(slices: SliceDefinition[]): string {
  const imports = slices
    .map((s) => `import ${s.name}Reducer from "./slices/${s.name}Slice";`)
    .join("\n");

  const reducers = slices
    .map((s) => `    ${s.name}: ${s.name}Reducer,`)
    .join("\n");

  return `import { configureStore } from "@reduxjs/toolkit";
${imports}

export const store = configureStore({
  reducer: {
${reducers}
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
}

/**
 * Generate typed hooks for the store
 */
export function generateHooksCode(): string {
  return `import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
}

/**
 * Generate the Redux provider component
 */
export function generateProviderCode(): string {
  return `"use client";

import { Provider } from "react-redux";
import { store } from "./index";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
`;
}
