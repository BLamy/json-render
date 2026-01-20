/**
 * Service Worker for intercepting API requests and serving from PGLite
 *
 * This service worker intercepts /api/sync/* requests and handles them
 * locally using PGLite, enabling offline-first functionality.
 */

const CACHE_NAME = "dashboard-v1";
const API_PREFIX = "/api/sync";

// PGLite will be initialized via message from main thread
let dbReady = false;
let pendingRequests = [];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");
  event.waitUntil(clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data.type === "DB_READY") {
    console.log("[SW] Database ready signal received");
    dbReady = true;
    // Process any pending requests
    for (const { request, resolve } of pendingRequests) {
      handleAPIRequest(request).then(resolve);
    }
    pendingRequests = [];
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept /api/sync/* requests
  if (url.pathname.startsWith(API_PREFIX)) {
    console.log("[SW] Intercepting:", url.pathname);
    event.respondWith(handleAPIRequest(event.request));
  }
});

/**
 * Handle API requests by routing to the main thread's PGLite
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(API_PREFIX, "");
  const method = request.method;

  try {
    // Get request body for POST/PUT/PATCH
    let body = null;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      body = await request.json();
    }

    // Send to main thread for processing
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      return new Response(JSON.stringify({ error: "No active client" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a message channel for response
    const messageChannel = new MessageChannel();

    const responsePromise = new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
    });

    // Send request to main thread
    clients[0].postMessage(
      {
        type: "DB_REQUEST",
        path,
        method,
        body,
        searchParams: Object.fromEntries(url.searchParams),
      },
      [messageChannel.port2]
    );

    // Wait for response
    const result = await responsePromise;

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.data), {
      status: result.status || 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SW] Error handling request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
