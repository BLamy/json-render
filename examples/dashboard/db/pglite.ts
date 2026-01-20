import { PGlite } from "@electric-sql/pglite";

// Singleton PGLite instance
let db: PGlite | null = null;

/**
 * Initialize PGLite database with schema
 */
export async function initDatabase(): Promise<PGlite> {
  if (db) return db;

  // Create in-memory database (or use IndexedDB for persistence)
  db = new PGlite();

  // Create tables
  await db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'guest')),
      department TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      total DECIMAL(10, 2) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);

  // Seed with sample data if empty
  const userCount = await db.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM users",
  );
  if (userCount.rows[0]?.count === 0) {
    await seedDatabase(db);
  }

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): PGlite {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Seed the database with sample data
 */
async function seedDatabase(db: PGlite): Promise<void> {
  // Sample users
  const users = [
    {
      id: crypto.randomUUID(),
      name: "Alice Johnson",
      email: "alice@example.com",
      role: "admin",
      department: "Engineering",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Bob Smith",
      email: "bob@example.com",
      role: "user",
      department: "Engineering",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Carol Williams",
      email: "carol@example.com",
      role: "user",
      department: "Sales",
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "David Brown",
      email: "david@example.com",
      role: "user",
      department: "Marketing",
      active: false,
    },
    {
      id: crypto.randomUUID(),
      name: "Eve Davis",
      email: "eve@example.com",
      role: "guest",
      department: "Sales",
      active: true,
    },
  ];

  for (const user of users) {
    await db.query(
      `INSERT INTO users (id, name, email, role, department, active) VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.name, user.email, user.role, user.department, user.active],
    );
  }

  // Sample products
  const products = [
    {
      id: crypto.randomUUID(),
      name: "Laptop Pro",
      description: "High-performance laptop",
      price: 1299.99,
      category: "Electronics",
      stock: 50,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 49.99,
      category: "Electronics",
      stock: 200,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Office Chair",
      description: "Comfortable ergonomic chair",
      price: 299.99,
      category: "Furniture",
      stock: 30,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Standing Desk",
      description: "Adjustable standing desk",
      price: 599.99,
      category: "Furniture",
      stock: 15,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: 'Monitor 27"',
      description: "4K IPS display",
      price: 449.99,
      category: "Electronics",
      stock: 75,
      active: true,
    },
  ];

  for (const product of products) {
    await db.query(
      `INSERT INTO products (id, name, description, price, category, stock, active) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.active,
      ],
    );
  }

  // Sample orders
  const statuses = ["pending", "processing", "shipped", "delivered"];
  for (let i = 0; i < 10; i++) {
    const user = users[Math.floor(Math.random() * users.length)]!;
    const product = products[Math.floor(Math.random() * products.length)]!;
    const quantity = Math.floor(Math.random() * 5) + 1;
    const total = product.price * quantity;
    const status = statuses[Math.floor(Math.random() * statuses.length)]!;

    await db.query(
      `INSERT INTO orders (id, user_id, product_id, quantity, total, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), user.id, product.id, quantity, total, status],
    );
  }
}

/**
 * Convert snake_case database rows to camelCase
 */
export function toCamelCase<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Execute a query and return camelCase results
 */
export async function query<T extends Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const db = getDatabase();
  const result = await db.query<T>(sql, params);
  return result.rows.map(toCamelCase);
}
