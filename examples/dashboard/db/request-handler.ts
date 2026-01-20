import { getDatabase, toCamelCase, initDatabase } from "./pglite";
import type { User, CreateUser, UpdateUser } from "./schemas/UserSchema";
import type {
  Product,
  CreateProduct,
  UpdateProduct,
} from "./schemas/ProductSchema";
import type { Order, CreateOrder, UpdateOrder } from "./schemas/OrderSchema";

/**
 * Database request from service worker
 */
export interface DBRequest {
  type: "DB_REQUEST";
  path: string;
  method: string;
  body?: unknown;
  searchParams?: Record<string, string>;
}

/**
 * Database response
 */
export interface DBResponse {
  data?: unknown;
  error?: string;
  status?: number;
}

/**
 * Handle a database request from the service worker
 */
export async function handleDBRequest(request: DBRequest): Promise<DBResponse> {
  const { path, method, body, searchParams } = request;

  try {
    const db = getDatabase();

    // Route based on path
    if (path.startsWith("/users")) {
      return handleUsersRequest(path, method, body, searchParams);
    }
    if (path.startsWith("/products")) {
      return handleProductsRequest(path, method, body, searchParams);
    }
    if (path.startsWith("/orders")) {
      return handleOrdersRequest(path, method, body, searchParams);
    }
    if (path === "/metrics") {
      return handleMetricsRequest();
    }

    return { error: "Not found", status: 404 };
  } catch (error) {
    console.error("[DB Handler] Error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    };
  }
}

/**
 * Handle /users requests
 */
async function handleUsersRequest(
  path: string,
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>,
): Promise<DBResponse> {
  const db = getDatabase();
  const idMatch = path.match(/^\/users\/([^/]+)$/);
  const id = idMatch?.[1];

  // GET /users
  if (method === "GET" && path === "/users") {
    let query = "SELECT * FROM users WHERE 1=1";
    const params: unknown[] = [];

    if (searchParams?.role) {
      params.push(searchParams.role);
      query += ` AND role = $${params.length}`;
    }
    if (searchParams?.department) {
      params.push(searchParams.department);
      query += ` AND department = $${params.length}`;
    }
    if (searchParams?.active !== undefined) {
      params.push(searchParams.active === "true");
      query += ` AND active = $${params.length}`;
    }

    query += " ORDER BY created_at DESC";

    const result = await db.query<Record<string, unknown>>(query, params);
    return { data: result.rows.map(toCamelCase) };
  }

  // GET /users/:id
  if (method === "GET" && id) {
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM users WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return { error: "User not found", status: 404 };
    }
    return { data: toCamelCase(result.rows[0]!) };
  }

  // POST /users
  if (method === "POST" && path === "/users") {
    const userData = body as CreateUser;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO users (id, name, email, role, department, active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        userData.name,
        userData.email,
        userData.role,
        userData.department,
        userData.active,
      ],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM users WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!), status: 201 };
  }

  // PUT /users/:id
  if (method === "PUT" && id) {
    const userData = body as UpdateUser;
    await db.query(
      `UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email),
       role = COALESCE($4, role), department = COALESCE($5, department),
       active = COALESCE($6, active), updated_at = NOW() WHERE id = $1`,
      [
        id,
        userData.name,
        userData.email,
        userData.role,
        userData.department,
        userData.active,
      ],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM users WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!) };
  }

  // DELETE /users/:id
  if (method === "DELETE" && id) {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    return { data: { success: true } };
  }

  return { error: "Method not allowed", status: 405 };
}

/**
 * Handle /products requests
 */
async function handleProductsRequest(
  path: string,
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>,
): Promise<DBResponse> {
  const db = getDatabase();
  const idMatch = path.match(/^\/products\/([^/]+)$/);
  const id = idMatch?.[1];

  // GET /products
  if (method === "GET" && path === "/products") {
    let query = "SELECT * FROM products WHERE 1=1";
    const params: unknown[] = [];

    if (searchParams?.category) {
      params.push(searchParams.category);
      query += ` AND category = $${params.length}`;
    }
    if (searchParams?.active !== undefined) {
      params.push(searchParams.active === "true");
      query += ` AND active = $${params.length}`;
    }

    query += " ORDER BY created_at DESC";

    const result = await db.query<Record<string, unknown>>(query, params);
    return { data: result.rows.map(toCamelCase) };
  }

  // GET /products/:id
  if (method === "GET" && id) {
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return { error: "Product not found", status: 404 };
    }
    return { data: toCamelCase(result.rows[0]!) };
  }

  // POST /products
  if (method === "POST" && path === "/products") {
    const productData = body as CreateProduct;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO products (id, name, description, price, category, stock, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        productData.name,
        productData.description,
        productData.price,
        productData.category,
        productData.stock,
        productData.active,
      ],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!), status: 201 };
  }

  // PUT /products/:id
  if (method === "PUT" && id) {
    const productData = body as UpdateProduct;
    await db.query(
      `UPDATE products SET name = COALESCE($2, name), description = COALESCE($3, description),
       price = COALESCE($4, price), category = COALESCE($5, category),
       stock = COALESCE($6, stock), active = COALESCE($7, active), updated_at = NOW() WHERE id = $1`,
      [
        id,
        productData.name,
        productData.description,
        productData.price,
        productData.category,
        productData.stock,
        productData.active,
      ],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!) };
  }

  // DELETE /products/:id
  if (method === "DELETE" && id) {
    await db.query("DELETE FROM products WHERE id = $1", [id]);
    return { data: { success: true } };
  }

  return { error: "Method not allowed", status: 405 };
}

/**
 * Handle /orders requests
 */
async function handleOrdersRequest(
  path: string,
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>,
): Promise<DBResponse> {
  const db = getDatabase();
  const idMatch = path.match(/^\/orders\/([^/]+)$/);
  const id = idMatch?.[1];

  // GET /orders
  if (method === "GET" && path === "/orders") {
    let query = `
      SELECT o.*, u.name as user_name, p.name as product_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN products p ON o.product_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (searchParams?.status) {
      params.push(searchParams.status);
      query += ` AND o.status = $${params.length}`;
    }
    if (searchParams?.userId) {
      params.push(searchParams.userId);
      query += ` AND o.user_id = $${params.length}`;
    }

    query += " ORDER BY o.created_at DESC";

    const result = await db.query<Record<string, unknown>>(query, params);
    return { data: result.rows.map(toCamelCase) };
  }

  // GET /orders/:id
  if (method === "GET" && id) {
    const result = await db.query<Record<string, unknown>>(
      `SELECT o.*, u.name as user_name, p.name as product_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return { error: "Order not found", status: 404 };
    }
    return { data: toCamelCase(result.rows[0]!) };
  }

  // POST /orders
  if (method === "POST" && path === "/orders") {
    const orderData = body as CreateOrder;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO orders (id, user_id, product_id, quantity, total, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        orderData.userId,
        orderData.productId,
        orderData.quantity,
        orderData.total,
        orderData.status,
      ],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM orders WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!), status: 201 };
  }

  // PUT /orders/:id
  if (method === "PUT" && id) {
    const orderData = body as UpdateOrder;
    await db.query(
      `UPDATE orders SET status = COALESCE($2, status), quantity = COALESCE($3, quantity),
       total = COALESCE($4, total), updated_at = NOW() WHERE id = $1`,
      [id, orderData.status, orderData.quantity, orderData.total],
    );
    const result = await db.query<Record<string, unknown>>(
      "SELECT * FROM orders WHERE id = $1",
      [id],
    );
    return { data: toCamelCase(result.rows[0]!) };
  }

  // DELETE /orders/:id
  if (method === "DELETE" && id) {
    await db.query("DELETE FROM orders WHERE id = $1", [id]);
    return { data: { success: true } };
  }

  return { error: "Method not allowed", status: 405 };
}

/**
 * Handle /metrics request
 */
async function handleMetricsRequest(): Promise<DBResponse> {
  const db = getDatabase();

  const [usersResult, productsResult, ordersResult, revenueResult] =
    await Promise.all([
      db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM users WHERE active = true",
      ),
      db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM products WHERE active = true",
      ),
      db.query<{ count: string }>("SELECT COUNT(*) as count FROM orders"),
      db.query<{ total: string }>(
        "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'",
      ),
    ]);

  return {
    data: {
      activeUsers: parseInt(usersResult.rows[0]?.count || "0"),
      activeProducts: parseInt(productsResult.rows[0]?.count || "0"),
      totalOrders: parseInt(ordersResult.rows[0]?.count || "0"),
      totalRevenue: parseFloat(revenueResult.rows[0]?.total || "0"),
    },
  };
}

/**
 * Initialize database and set up service worker communication
 */
export async function setupDatabaseBridge(): Promise<void> {
  // Initialize database
  await initDatabase();

  // Listen for messages from service worker
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data.type === "DB_REQUEST") {
        const response = await handleDBRequest(event.data);
        // Reply through the message port
        if (event.ports[0]) {
          event.ports[0].postMessage(response);
        }
      }
    });

    // Notify service worker that DB is ready
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: "DB_READY" });
    }
  }
}
