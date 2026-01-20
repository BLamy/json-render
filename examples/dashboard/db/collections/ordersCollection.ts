"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Order, CreateOrder, UpdateOrder } from "../schemas";

const API_BASE = "/api/sync";

// Extended order type with joined fields
export interface OrderWithDetails extends Order {
  userName?: string;
  productName?: string;
}

/**
 * Fetch all orders
 */
async function fetchOrders(params?: {
  status?: string;
  userId?: string;
}): Promise<OrderWithDetails[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.userId) searchParams.set("userId", params.userId);

  const url = `${API_BASE}/orders${searchParams.toString() ? `?${searchParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch orders");
  return response.json();
}

/**
 * Fetch a single order by ID
 */
async function fetchOrder(id: string): Promise<OrderWithDetails> {
  const response = await fetch(`${API_BASE}/orders/${id}`);
  if (!response.ok) throw new Error("Failed to fetch order");
  return response.json();
}

/**
 * Create a new order
 */
async function createOrder(data: CreateOrder): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create order");
  return response.json();
}

/**
 * Update an order
 */
async function updateOrder(data: UpdateOrder): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update order");
  return response.json();
}

/**
 * Delete an order
 */
async function deleteOrder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/orders/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete order");
}

// Query keys
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters?: { status?: string; userId?: string }) =>
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Hook: Get all orders
 */
export function useOrders(params?: { status?: string; userId?: string }) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => fetchOrders(params),
  });
}

/**
 * Hook: Get a single order
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });
}

/**
 * Hook: Create an order with optimistic update
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      const previousOrders = queryClient.getQueryData<Order[]>(
        orderKeys.list(),
      );

      if (previousOrders) {
        const optimisticOrder: Order = {
          ...newOrder,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<Order[]>(orderKeys.list(), [
          ...previousOrders,
          optimisticOrder,
        ]);
      }

      return { previousOrders };
    },
    onError: (err, newOrder, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list(), context.previousOrders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Hook: Update an order with optimistic update
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrder,
    onMutate: async (updatedOrder) => {
      await queryClient.cancelQueries({
        queryKey: orderKeys.detail(updatedOrder.id),
      });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      const previousOrder = queryClient.getQueryData<Order>(
        orderKeys.detail(updatedOrder.id),
      );
      const previousOrders = queryClient.getQueryData<Order[]>(
        orderKeys.list(),
      );

      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(updatedOrder.id), {
          ...previousOrder,
          ...updatedOrder,
          updatedAt: new Date(),
        });
      }

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(
          orderKeys.list(),
          previousOrders.map((o) =>
            o.id === updatedOrder.id
              ? { ...o, ...updatedOrder, updatedAt: new Date() }
              : o,
          ),
        );
      }

      return { previousOrder, previousOrders };
    },
    onError: (err, updatedOrder, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderKeys.detail(updatedOrder.id),
          context.previousOrder,
        );
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list(), context.previousOrders);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: orderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Hook: Delete an order with optimistic update
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrder,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      const previousOrders = queryClient.getQueryData<Order[]>(
        orderKeys.list(),
      );

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(
          orderKeys.list(),
          previousOrders.filter((o) => o.id !== id),
        );
      }

      return { previousOrders };
    },
    onError: (err, id, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list(), context.previousOrders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
