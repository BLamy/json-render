import { z } from "zod";

/**
 * Field type definitions that AI can generate for table columns
 */
export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "json",
  "uuid",
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

/**
 * Column constraints for validation
 */
export const ColumnConstraintsSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

export type ColumnConstraints = z.infer<typeof ColumnConstraintsSchema>;

/**
 * Column/field definition for a table
 */
export const ColumnSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  nullable: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  description: z.string().optional(),
  constraints: ColumnConstraintsSchema.optional(),
});

export type Column = z.infer<typeof ColumnSchema>;

/**
 * Relationship types between tables
 */
export const RelationshipTypeSchema = z.enum([
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many",
]);

/**
 * Relationship definition between tables
 */
export const RelationshipSchema = z.object({
  name: z.string(),
  type: RelationshipTypeSchema,
  target: z.string(), // Target table name
  foreignKey: z.string().optional(),
  through: z.string().optional(), // For many-to-many junction table
});

export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Index definition for query optimization
 */
export const IndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  unique: z.boolean().optional().default(false),
});

export type Index = z.infer<typeof IndexSchema>;

/**
 * Complete table schema definition
 */
export const TableSchemaDefinition = z.object({
  name: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/), // PascalCase
  description: z.string(),
  primaryKey: z.string().optional().default("id"),
  columns: z.array(ColumnSchema),
  relationships: z.array(RelationshipSchema).optional(),
  indexes: z.array(IndexSchema).optional(),
  timestamps: z.boolean().optional().default(true), // createdAt, updatedAt
  softDelete: z.boolean().optional().default(false), // deletedAt
});

export type TableSchema = z.infer<typeof TableSchemaDefinition>;

/**
 * Collection of tables for a database schema
 */
export const DatabaseSchemaDefinition = z.object({
  tables: z.array(TableSchemaDefinition),
});

export type DatabaseSchema = z.infer<typeof DatabaseSchemaDefinition>;

/**
 * Map field type to Zod type string
 */
function mapFieldTypeToZod(type: FieldType): string {
  const map: Record<FieldType, string> = {
    string: "z.string()",
    number: "z.number()",
    boolean: "z.boolean()",
    date: "z.coerce.date()",
    datetime: "z.coerce.date()",
    json: "z.unknown()",
    uuid: "z.string().uuid()",
  };
  return map[type] || "z.unknown()";
}

/**
 * Map field type to TypeScript type string
 */
function mapFieldTypeToTS(type: FieldType): string {
  const map: Record<FieldType, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    date: "Date",
    datetime: "Date",
    json: "unknown",
    uuid: "string",
  };
  return map[type] || "unknown";
}

/**
 * Get default value for a field type
 */
export function getDefaultForType(type: FieldType): unknown {
  const map: Record<FieldType, unknown> = {
    string: "",
    number: 0,
    boolean: false,
    date: null,
    datetime: null,
    json: null,
    uuid: null,
  };
  return map[type];
}

/**
 * Generate Zod schema code from a table definition
 */
export function tableToZodSchema(table: TableSchema): string {
  const fields = table.columns.map((col) => {
    let zodType = mapFieldTypeToZod(col.type);

    // Apply constraints
    if (col.constraints) {
      if (col.type === "string") {
        if (col.constraints.minLength !== undefined) {
          zodType = zodType.replace(
            "()",
            `().min(${col.constraints.minLength})`,
          );
        }
        if (col.constraints.maxLength !== undefined) {
          zodType = zodType.replace(")", `.max(${col.constraints.maxLength}))`);
        }
        if (col.constraints.pattern !== undefined) {
          zodType = zodType.replace(
            ")",
            `.regex(/${col.constraints.pattern}/))`,
          );
        }
      }
      if (col.type === "number") {
        if (col.constraints.min !== undefined) {
          zodType = zodType.replace("()", `().min(${col.constraints.min})`);
        }
        if (col.constraints.max !== undefined) {
          zodType = zodType.replace(")", `.max(${col.constraints.max}))`);
        }
      }
      if (col.constraints.enum && col.constraints.enum.length > 0) {
        zodType = `z.enum([${col.constraints.enum.map((e) => `"${e}"`).join(", ")}])`;
      }
    }

    if (col.nullable) {
      zodType += ".nullable()";
    }

    return `  ${col.name}: ${zodType},`;
  });

  // Add primary key if not in columns
  const hasPrimaryKey = table.columns.some((c) => c.name === table.primaryKey);
  if (!hasPrimaryKey) {
    fields.unshift(`  ${table.primaryKey}: z.string().uuid(),`);
  }

  // Add timestamps
  if (table.timestamps) {
    fields.push("  createdAt: z.coerce.date(),");
    fields.push("  updatedAt: z.coerce.date(),");
  }

  // Add soft delete
  if (table.softDelete) {
    fields.push("  deletedAt: z.coerce.date().nullable(),");
  }

  return `import { z } from "zod";

/**
 * ${table.description}
 */
export const ${table.name}Schema = z.object({
${fields.join("\n")}
});

export type ${table.name} = z.infer<typeof ${table.name}Schema>;

/**
 * Schema for creating a new ${table.name}
 */
export const Create${table.name}Schema = ${table.name}Schema.omit({
  ${table.primaryKey}: true,
  ${table.timestamps ? "createdAt: true,\n  updatedAt: true," : ""}
  ${table.softDelete ? "deletedAt: true," : ""}
});

export type Create${table.name} = z.infer<typeof Create${table.name}Schema>;

/**
 * Schema for updating a ${table.name}
 */
export const Update${table.name}Schema = ${table.name}Schema.partial().required({
  ${table.primaryKey}: true,
});

export type Update${table.name} = z.infer<typeof Update${table.name}Schema>;
`;
}

/**
 * Generate TypeScript interface from a table definition
 */
export function tableToTypeScript(table: TableSchema): string {
  const fields = table.columns.map((col) => {
    const tsType = mapFieldTypeToTS(col.type);
    const nullable = col.nullable ? " | null" : "";
    return `  ${col.name}: ${tsType}${nullable};`;
  });

  // Add primary key
  const hasPrimaryKey = table.columns.some((c) => c.name === table.primaryKey);
  if (!hasPrimaryKey) {
    fields.unshift(`  ${table.primaryKey}: string;`);
  }

  // Add timestamps
  if (table.timestamps) {
    fields.push("  createdAt: Date;");
    fields.push("  updatedAt: Date;");
  }

  if (table.softDelete) {
    fields.push("  deletedAt: Date | null;");
  }

  return `/**
 * ${table.description}
 */
export interface ${table.name} {
${fields.join("\n")}
}`;
}

/**
 * Generate SQL CREATE TABLE statement from a table definition
 */
export function tableToSQL(table: TableSchema): string {
  const sqlTypeMap: Record<FieldType, string> = {
    string: "TEXT",
    number: "REAL",
    boolean: "INTEGER",
    date: "TEXT",
    datetime: "TEXT",
    json: "TEXT",
    uuid: "TEXT",
  };

  const columns: string[] = [];

  // Add primary key
  const hasPrimaryKey = table.columns.some((c) => c.name === table.primaryKey);
  if (!hasPrimaryKey) {
    columns.push(`  ${table.primaryKey} TEXT PRIMARY KEY`);
  }

  // Add columns
  for (const col of table.columns) {
    let colDef = `  ${col.name} ${sqlTypeMap[col.type]}`;
    if (col.name === table.primaryKey) {
      colDef += " PRIMARY KEY";
    }
    if (!col.nullable) {
      colDef += " NOT NULL";
    }
    if (col.default !== undefined) {
      colDef += ` DEFAULT ${JSON.stringify(col.default)}`;
    }
    columns.push(colDef);
  }

  // Add timestamps
  if (table.timestamps) {
    columns.push("  createdAt TEXT NOT NULL DEFAULT (datetime('now'))");
    columns.push("  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))");
  }

  if (table.softDelete) {
    columns.push("  deletedAt TEXT");
  }

  let sql = `CREATE TABLE IF NOT EXISTS ${table.name.toLowerCase()}s (\n${columns.join(",\n")}\n);`;

  // Add indexes
  if (table.indexes) {
    for (const index of table.indexes) {
      const uniqueStr = index.unique ? "UNIQUE " : "";
      sql += `\n\nCREATE ${uniqueStr}INDEX IF NOT EXISTS ${index.name} ON ${table.name.toLowerCase()}s (${index.columns.join(", ")});`;
    }
  }

  return sql;
}
