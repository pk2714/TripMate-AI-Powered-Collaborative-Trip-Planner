import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const DAY = 60 * 60 * 24;

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // "prompt" = a new version waits until the user clicks "Reload" in the
      // update toast (see src/components/PwaManager.jsx), so a deploy never
      // swaps code out from under someone mid-trip.
      registerType: "prompt",
      injectRegister: false, // registered from PwaManager via virtual:pwa-register/react
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png"],

      manifest: {
        id: "/",
        name: "TripMate — AI Trip Planner",
        short_name: "TripMate",
        description:
          "Plan trips together: AI itineraries, group chat, live location, expense splitting and emergency help.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#0b7d53",
        background_color: "#ffffff",
        lang: "en",
        categories: ["travel", "navigation", "social"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "My Trips",
            url: "/dashboard",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Plan a Trip",
            url: "/trips/new",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Emergency",
            url: "/emergency",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
        // Any client-side route works offline (served from the precached
        // index.html) — but never hijack API or Socket.IO requests.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],

        runtimeCaching: [
          {
            // OpenStreetMap tiles → map keeps working for areas already viewed
            urlPattern: ({ url }) => url.hostname.endsWith("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Leaflet marker icons (unpkg) and user-uploaded images (Cloudinary)
            urlPattern: ({ url }) =>
              url.hostname === "unpkg.com" || url.hostname === "res.cloudinary.com",
            handler: "CacheFirst",
            options: {
              cacheName: "remote-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Destination geocoding
            urlPattern: ({ url }) => url.hostname === "nominatim.openstreetmap.org",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "geocoding",
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Read-only API data → fresh when online, last copy when offline.
            // This cache is cleared on logout (see AuthContext).
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              /^\/api\/(trips|auth\/me|emergency|chat\/[^/]+\/messages|users)/.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-data",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 150, maxAgeSeconds: 7 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Other same-origin static files not in the precache
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:js|css|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  server: {
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
