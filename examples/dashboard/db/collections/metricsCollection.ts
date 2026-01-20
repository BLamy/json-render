"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/sync";

/**
 * Dashboard metrics type
 */
export interface DashboardMetrics {
  activeUsers: number;
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

/**
 * Fetch dashboard metrics
 */
async function fetchMetrics(): Promise<DashboardMetrics> {
  const response = await fetch(`${API_BASE}/metrics`);
  if (!response.ok) throw new Error("Failed to fetch metrics");
  return response.json();
}

// Query keys
export const metricsKeys = {
  all: ["metrics"] as const,
};

/**
 * Hook: Get dashboard metrics
 */
export function useMetrics() {
  return useQuery({
    queryKey: metricsKeys.all,
    queryFn: fetchMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
