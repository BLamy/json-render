"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { store } from "../store";
import { queryClient, setupDatabaseBridge } from "../db";
import {
  setInitializing,
  setServiceWorkerReady,
} from "../store/slices/uiSlice";

// Get basePath from environment variable (set during build)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Root providers component
 * Sets up Redux store, TanStack Query, and database initialization
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Register service worker with correct scope
        if ("serviceWorker" in navigator) {
          const swPath = `${basePath}/sw.js`;
          const swScope = `${basePath}/`;
          const registration = await navigator.serviceWorker.register(swPath, {
            scope: swScope,
          });
          console.log("[App] Service worker registered:", registration.scope);

          // Wait for service worker to be ready
          await navigator.serviceWorker.ready;
          store.dispatch(setServiceWorkerReady(true));
        }

        // Initialize database and set up communication bridge
        await setupDatabaseBridge();
        console.log("[App] Database initialized");

        store.dispatch(setInitializing(false));
        setIsReady(true);
      } catch (error) {
        console.error("[App] Initialization error:", error);
        // Still mark as ready so app can show error state
        store.dispatch(setInitializing(false));
        setIsReady(true);
      }
    }

    init();
  }, []);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}
