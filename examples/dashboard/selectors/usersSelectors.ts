"use client";

import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { useUsers } from "../db/collections";
import {
  selectUserSearch,
  selectSelectedDepartment,
  selectSelectedRoles,
  selectShowActiveUsersOnly,
} from "../store/slices/filtersSlice";
import type { User } from "../db/schemas";

/**
 * Hook: Get filtered and sorted users
 * Combines server data (TanStack Query) with local filter state (RTK)
 */
export function useFilteredUsers() {
  // Get filter state from RTK
  const searchTerm = useAppSelector(selectUserSearch);
  const selectedDepartment = useAppSelector(selectSelectedDepartment);
  const selectedRoles = useAppSelector(selectSelectedRoles);
  const showActiveOnly = useAppSelector(selectShowActiveUsersOnly);

  // Get users from TanStack Query
  const { data: users = [], isLoading, error } = useUsers();

  // Compute filtered result
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      );
    }

    // Apply department filter
    if (selectedDepartment) {
      result = result.filter((user) => user.department === selectedDepartment);
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      result = result.filter((user) => selectedRoles.includes(user.role));
    }

    // Apply active filter
    if (showActiveOnly) {
      result = result.filter((user) => user.active);
    }

    return result;
  }, [users, searchTerm, selectedDepartment, selectedRoles, showActiveOnly]);

  return { users: filteredUsers, isLoading, error };
}

/**
 * Hook: Get user counts by role
 */
export function useUserCountsByRole() {
  const { data: users = [] } = useUsers();

  return useMemo(() => {
    const counts = { admin: 0, user: 0, guest: 0 };
    for (const user of users) {
      if (user.role in counts) {
        counts[user.role as keyof typeof counts]++;
      }
    }
    return counts;
  }, [users]);
}

/**
 * Hook: Get user counts by department
 */
export function useUserCountsByDepartment() {
  const { data: users = [] } = useUsers();

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const user of users) {
      counts[user.department] = (counts[user.department] || 0) + 1;
    }
    return counts;
  }, [users]);
}

/**
 * Hook: Get unique departments from users
 */
export function useUniqueDepartments() {
  const { data: users = [] } = useUsers();

  return useMemo(() => {
    return [...new Set(users.map((u) => u.department))].sort();
  }, [users]);
}

/**
 * Hook: Get active user count
 */
export function useActiveUserCount() {
  const { data: users = [] } = useUsers();

  return useMemo(() => {
    return users.filter((u) => u.active).length;
  }, [users]);
}
