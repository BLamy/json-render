"use client";

import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { useOrders } from "../db/collections";
import {
  selectSelectedOrderStatus,
  selectSelectedUserId,
} from "../store/slices/filtersSlice";

/**
 * Hook: Get filtered orders
 * Combines server data (TanStack Query) with local filter state (RTK)
 */
export function useFilteredOrders() {
  // Get filter state from RTK
  const selectedStatus = useAppSelector(selectSelectedOrderStatus);
  const selectedUserId = useAppSelector(selectSelectedUserId);

  // Get orders from TanStack Query
  const { data: orders = [], isLoading, error } = useOrders();

  // Compute filtered result
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply status filter
    if (selectedStatus) {
      result = result.filter((order) => order.status === selectedStatus);
    }

    // Apply user filter
    if (selectedUserId) {
      result = result.filter((order) => order.userId === selectedUserId);
    }

    return result;
  }, [orders, selectedStatus, selectedUserId]);

  return { orders: filteredOrders, isLoading, error };
}

/**
 * Hook: Get order counts by status
 */
export function useOrderCountsByStatus() {
  const { data: orders = [] } = useOrders();

  return useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of orders) {
      const status = order.status;
      if (status in counts) {
        counts[status] = (counts[status] ?? 0) + 1;
      }
    }
    return counts;
  }, [orders]);
}

/**
 * Hook: Get total revenue (excluding cancelled orders)
 */
export function useTotalRevenue() {
  const { data: orders = [] } = useOrders();

  return useMemo(() => {
    return orders
      .filter((o) => o.status !== "cancelled")
      .reduce((total, o) => total + o.total, 0);
  }, [orders]);
}

/**
 * Hook: Get recent orders (last 5)
 */
export function useRecentOrders(limit = 5) {
  const { data: orders = [] } = useOrders();

  return useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }, [orders, limit]);
}

/**
 * Hook: Get pending orders count
 */
export function usePendingOrdersCount() {
  const { data: orders = [] } = useOrders();

  return useMemo(() => {
    return orders.filter((o) => o.status === "pending").length;
  }, [orders]);
}
