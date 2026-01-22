"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, CreateProduct, UpdateProduct } from "../schemas";
import { API_BASE } from "../api";

/**
 * Fetch all products
 */
async function fetchProducts(params?: {
  category?: string;
  active?: boolean;
}): Promise<Product[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.active !== undefined)
    searchParams.set("active", String(params.active));

  const url = `${API_BASE}/products${searchParams.toString() ? `?${searchParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
}

/**
 * Fetch a single product by ID
 */
async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`${API_BASE}/products/${id}`);
  if (!response.ok) throw new Error("Failed to fetch product");
  return response.json();
}

/**
 * Create a new product
 */
async function createProduct(data: CreateProduct): Promise<Product> {
  const response = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create product");
  return response.json();
}

/**
 * Update a product
 */
async function updateProduct(data: UpdateProduct): Promise<Product> {
  const response = await fetch(`${API_BASE}/products/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update product");
  return response.json();
}

/**
 * Delete a product
 */
async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete product");
}

// Query keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: { category?: string; active?: boolean }) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Hook: Get all products
 */
export function useProducts(params?: { category?: string; active?: boolean }) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
  });
}

/**
 * Hook: Get a single product
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

/**
 * Hook: Create a product with optimistic update
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProducts = queryClient.getQueryData<Product[]>(
        productKeys.list(),
      );

      if (previousProducts) {
        const optimisticProduct: Product = {
          ...newProduct,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<Product[]>(productKeys.list(), [
          ...previousProducts,
          optimisticProduct,
        ]);
      }

      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.list(), context.previousProducts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Hook: Update a product with optimistic update
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onMutate: async (updatedProduct) => {
      await queryClient.cancelQueries({
        queryKey: productKeys.detail(updatedProduct.id),
      });
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProduct = queryClient.getQueryData<Product>(
        productKeys.detail(updatedProduct.id),
      );
      const previousProducts = queryClient.getQueryData<Product[]>(
        productKeys.list(),
      );

      if (previousProduct) {
        queryClient.setQueryData<Product>(
          productKeys.detail(updatedProduct.id),
          {
            ...previousProduct,
            ...updatedProduct,
            updatedAt: new Date(),
          },
        );
      }

      if (previousProducts) {
        queryClient.setQueryData<Product[]>(
          productKeys.list(),
          previousProducts.map((p) =>
            p.id === updatedProduct.id
              ? { ...p, ...updatedProduct, updatedAt: new Date() }
              : p,
          ),
        );
      }

      return { previousProduct, previousProducts };
    },
    onError: (err, updatedProduct, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(updatedProduct.id),
          context.previousProduct,
        );
      }
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.list(), context.previousProducts);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Hook: Delete a product with optimistic update
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProducts = queryClient.getQueryData<Product[]>(
        productKeys.list(),
      );

      if (previousProducts) {
        queryClient.setQueryData<Product[]>(
          productKeys.list(),
          previousProducts.filter((p) => p.id !== id),
        );
      }

      return { previousProducts };
    },
    onError: (err, id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.list(), context.previousProducts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
