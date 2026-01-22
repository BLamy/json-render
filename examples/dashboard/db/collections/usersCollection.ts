"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, CreateUser, UpdateUser } from "../schemas";
import { API_BASE } from "../api";

/**
 * Fetch all users
 */
async function fetchUsers(params?: {
  role?: string;
  department?: string;
  active?: boolean;
}): Promise<User[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.department) searchParams.set("department", params.department);
  if (params?.active !== undefined)
    searchParams.set("active", String(params.active));

  const url = `${API_BASE}/users${searchParams.toString() ? `?${searchParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

/**
 * Fetch a single user by ID
 */
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${id}`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}

/**
 * Create a new user
 */
async function createUser(data: CreateUser): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create user");
  return response.json();
}

/**
 * Update a user
 */
async function updateUser(data: UpdateUser): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
}

/**
 * Delete a user
 */
async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete user");
}

// Query keys
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters?: { role?: string; department?: string; active?: boolean }) =>
    [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Hook: Get all users
 */
export function useUsers(params?: {
  role?: string;
  department?: string;
  active?: boolean;
}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => fetchUsers(params),
  });
}

/**
 * Hook: Get a single user
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
}

/**
 * Hook: Create a user with optimistic update
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically add to cache
      if (previousUsers) {
        const optimisticUser: User = {
          ...newUser,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<User[]>(userKeys.list(), [
          ...previousUsers,
          optimisticUser,
        ]);
      }

      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Hook: Update a user with optimistic update
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({
        queryKey: userKeys.detail(updatedUser.id),
      });
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      const previousUser = queryClient.getQueryData<User>(
        userKeys.detail(updatedUser.id),
      );
      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      // Optimistically update
      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(updatedUser.id), {
          ...previousUser,
          ...updatedUser,
          updatedAt: new Date(),
        });
      }

      if (previousUsers) {
        queryClient.setQueryData<User[]>(
          userKeys.list(),
          previousUsers.map((u) =>
            u.id === updatedUser.id
              ? { ...u, ...updatedUser, updatedAt: new Date() }
              : u,
          ),
        );
      }

      return { previousUser, previousUsers };
    },
    onError: (err, updatedUser, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(
          userKeys.detail(updatedUser.id),
          context.previousUser,
        );
      }
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Hook: Delete a user with optimistic update
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      const previousUsers = queryClient.getQueryData<User[]>(userKeys.list());

      if (previousUsers) {
        queryClient.setQueryData<User[]>(
          userKeys.list(),
          previousUsers.filter((u) => u.id !== id),
        );
      }

      return { previousUsers };
    },
    onError: (err, id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.list(), context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
