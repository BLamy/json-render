export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  userKeys,
} from "./usersCollection";
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  productKeys,
} from "./productsCollection";
export {
  useOrders,
  useOrder,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  orderKeys,
} from "./ordersCollection";
export type { OrderWithDetails } from "./ordersCollection";
export { useMetrics, metricsKeys } from "./metricsCollection";
export type { DashboardMetrics } from "./metricsCollection";
