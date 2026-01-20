"use client";

import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { useProducts } from "../db/collections";
import {
  selectProductSearch,
  selectSelectedCategory,
  selectShowActiveProductsOnly,
} from "../store/slices/filtersSlice";
import type { Product } from "../db/schemas";

/**
 * Hook: Get filtered products
 * Combines server data (TanStack Query) with local filter state (RTK)
 */
export function useFilteredProducts() {
  // Get filter state from RTK
  const searchTerm = useAppSelector(selectProductSearch);
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const showActiveOnly = useAppSelector(selectShowActiveProductsOnly);

  // Get products from TanStack Query
  const { data: products = [], isLoading, error } = useProducts();

  // Compute filtered result
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.description?.toLowerCase().includes(term) ?? false),
      );
    }

    // Apply category filter
    if (selectedCategory) {
      result = result.filter(
        (product) => product.category === selectedCategory,
      );
    }

    // Apply active filter
    if (showActiveOnly) {
      result = result.filter((product) => product.active);
    }

    return result;
  }, [products, searchTerm, selectedCategory, showActiveOnly]);

  return { products: filteredProducts, isLoading, error };
}

/**
 * Hook: Get product counts by category
 */
export function useProductCountsByCategory() {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products) {
      counts[product.category] = (counts[product.category] || 0) + 1;
    }
    return counts;
  }, [products]);
}

/**
 * Hook: Get unique categories from products
 */
export function useUniqueCategories() {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    return [...new Set(products.map((p) => p.category))].sort();
  }, [products]);
}

/**
 * Hook: Get low stock products (stock < 20)
 */
export function useLowStockProducts() {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    return products.filter((p) => p.stock < 20 && p.active);
  }, [products]);
}

/**
 * Hook: Get total inventory value
 */
export function useTotalInventoryValue() {
  const { data: products = [] } = useProducts();

  return useMemo(() => {
    return products.reduce((total, p) => total + p.price * p.stock, 0);
  }, [products]);
}
