"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setUserSearch,
  setSelectedDepartment,
  toggleRole,
  setShowActiveUsersOnly,
  setProductSearch,
  setSelectedCategory,
  setShowActiveProductsOnly,
  setSelectedOrderStatus,
  setSelectedUserId,
  resetUserFilters,
  resetProductFilters,
  resetOrderFilters,
  selectUserSearch,
  selectSelectedDepartment,
  selectSelectedRoles,
  selectShowActiveUsersOnly,
  selectProductSearch,
  selectSelectedCategory,
  selectShowActiveProductsOnly,
  selectSelectedOrderStatus,
  selectSelectedUserId,
  selectHasActiveUserFilters,
  selectHasActiveProductFilters,
  selectHasActiveOrderFilters,
} from "../../store/slices/filtersSlice";
import {
  selectSidebarOpen,
  toggleSidebar,
  setTheme,
  selectTheme,
} from "../../store/slices/uiSlice";
import {
  useFilteredUsers,
  useUserCountsByRole,
  useUniqueDepartments,
  useActiveUserCount,
} from "../../selectors/usersSelectors";
import {
  useFilteredProducts,
  useProductCountsByCategory,
  useUniqueCategories,
  useLowStockProducts,
  useTotalInventoryValue,
} from "../../selectors/productsSelectors";
import {
  useFilteredOrders,
  useOrderCountsByStatus,
  useTotalRevenue,
  useRecentOrders,
  usePendingOrdersCount,
} from "../../selectors/ordersSelectors";
import { useCreateUser, useDeleteUser } from "../../db/collections";
import type { User, Product, Order } from "../../db/schemas";

// Tab type
type Tab = "users" | "products" | "orders" | "overview";

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const isSidebarOpen = useAppSelector(selectSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              State Management Demo
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              TanStack Query + RTK + PGLite
            </span>
            <button
              onClick={() =>
                dispatch(setTheme(theme === "light" ? "dark" : "light"))
              }
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
            <nav className="p-4 space-y-1">
              {(["overview", "users", "products", "orders"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-4 py-2 rounded-lg capitalize ${
                      activeTab === tab
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "orders" && <OrdersTab />}
        </main>
      </div>
    </div>
  );
}

// Overview Tab - Dashboard metrics
function OverviewTab() {
  const totalRevenue = useTotalRevenue();
  const activeUserCount = useActiveUserCount();
  const pendingOrdersCount = usePendingOrdersCount();
  const inventoryValue = useTotalInventoryValue();
  const orderCounts = useOrderCountsByStatus();
  const userCounts = useUserCountsByRole();
  const lowStockProducts = useLowStockProducts();
  const recentOrders = useRecentOrders(5);

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          subtitle="Excluding cancelled"
        />
        <MetricCard
          title="Active Users"
          value={activeUserCount.toString()}
          subtitle="Currently active"
        />
        <MetricCard
          title="Pending Orders"
          value={pendingOrdersCount.toString()}
          subtitle="Awaiting processing"
        />
        <MetricCard
          title="Inventory Value"
          value={`$${inventoryValue.toLocaleString()}`}
          subtitle="Total stock value"
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Orders by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(orderCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="capitalize text-gray-600 dark:text-gray-400">
                  {status}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Users by Role
          </h3>
          <div className="space-y-3">
            {Object.entries(userCounts).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="capitalize text-gray-600 dark:text-gray-400">
                  {role}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-yellow-800 dark:text-yellow-300 font-medium mb-2">
            Low Stock Alert ({lowStockProducts.length} products)
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
            {lowStockProducts.slice(0, 5).map((p) => (
              <li key={p.id}>
                {p.name}: {p.stock} units remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Orders
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-gray-500 dark:text-gray-400">
                  Order ID
                </th>
                <th className="text-left py-2 text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="text-left py-2 text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left py-2 text-gray-500 dark:text-gray-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-2 text-gray-900 dark:text-white">
                    {order.id}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Users Tab with filters
function UsersTab() {
  const dispatch = useAppDispatch();
  const { users, isLoading, error } = useFilteredUsers();
  const departments = useUniqueDepartments();
  const hasFilters = useAppSelector(selectHasActiveUserFilters);

  // Filter state from RTK
  const searchTerm = useAppSelector(selectUserSearch);
  const selectedDepartment = useAppSelector(selectSelectedDepartment);
  const selectedRoles = useAppSelector(selectSelectedRoles);
  const showActiveOnly = useAppSelector(selectShowActiveUsersOnly);

  // Mutations
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const handleAddUser = async () => {
    const newUser = {
      id: `user-${Date.now()}`,
      name: `New User ${Date.now()}`,
      email: `user${Date.now()}@example.com`,
      role: "user" as const,
      department: "Engineering",
      active: true,
      createdAt: new Date().toISOString(),
    };
    await createUser.mutateAsync(newUser);
  };

  if (error) {
    return <ErrorMessage message="Failed to load users" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => dispatch(setUserSearch(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          <select
            value={selectedDepartment ?? ""}
            onChange={(e) =>
              dispatch(setSelectedDepartment(e.target.value || null))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {(["admin", "user", "guest"] as const).map((role) => (
              <label key={role} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => dispatch(toggleRole(role))}
                  className="rounded"
                />
                <span className="capitalize text-gray-700 dark:text-gray-300">
                  {role}
                </span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) =>
                dispatch(setShowActiveUsersOnly(e.target.checked))
              }
              className="rounded"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Active only
            </span>
          </label>

          {hasFilters && (
            <button
              onClick={() => dispatch(resetUserFilters())}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear filters
            </button>
          )}

          <button
            onClick={handleAddUser}
            disabled={createUser.isPending}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createUser.isPending ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {users.length} user{users.length !== 1 ? "s" : ""} found
          </span>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onDelete={() => deleteUser.mutate(user.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Products Tab with filters
function ProductsTab() {
  const dispatch = useAppDispatch();
  const { products, isLoading, error } = useFilteredProducts();
  const categories = useUniqueCategories();
  const hasFilters = useAppSelector(selectHasActiveProductFilters);

  const searchTerm = useAppSelector(selectProductSearch);
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const showActiveOnly = useAppSelector(selectShowActiveProductsOnly);

  if (error) {
    return <ErrorMessage message="Failed to load products" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => dispatch(setProductSearch(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          <select
            value={selectedCategory ?? ""}
            onChange={(e) =>
              dispatch(setSelectedCategory(e.target.value || null))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) =>
                dispatch(setShowActiveProductsOnly(e.target.checked))
              }
              className="rounded"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Active only
            </span>
          </label>

          {hasFilters && (
            <button
              onClick={() => dispatch(resetProductFilters())}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </span>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Orders Tab with filters
function OrdersTab() {
  const dispatch = useAppDispatch();
  const { orders, isLoading, error } = useFilteredOrders();
  const hasFilters = useAppSelector(selectHasActiveOrderFilters);

  const selectedStatus = useAppSelector(selectSelectedOrderStatus);
  const selectedUserId = useAppSelector(selectSelectedUserId);

  if (error) {
    return <ErrorMessage message="Failed to load orders" />;
  }

  const statuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedStatus ?? ""}
            onChange={(e) =>
              dispatch(setSelectedOrderStatus(e.target.value || null))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by User ID..."
            value={selectedUserId ?? ""}
            onChange={(e) =>
              dispatch(setSelectedUserId(e.target.value || null))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          {hasFilters && (
            <button
              onClick={() => dispatch(resetOrderFilters())}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </span>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    Order ID
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    User ID
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                      {order.id}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {order.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {order.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {subtitle}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    processing:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    shipped:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    delivered:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

function UserRow({ user, onDelete }: { user: User; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {user.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {user.department}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs font-medium capitalize ${
            user.role === "admin"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
              : user.role === "user"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {user.role}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${user.active ? "bg-green-500" : "bg-gray-300"}`}
        />
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {product.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {product.category}
          </p>
        </div>
        <span
          className={`w-2 h-2 rounded-full mt-2 ${product.active ? "bg-green-500" : "bg-gray-300"}`}
        />
      </div>
      {product.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
          {product.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-4">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          ${product.price.toFixed(2)}
        </span>
        <span
          className={`text-sm ${product.stock < 20 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
        >
          {product.stock} in stock
        </span>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p className="text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}
