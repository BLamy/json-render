/**
 * API utilities for database collections
 */

// Get basePath from environment variable (set during build)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const API_BASE = `${basePath}/api/sync`;
