import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

        manifest: {
         name: "TripMate",
         short_name: "TripMate",
         description: "TripMate travel application",
         theme_color: "#ffffff",
         background_color: "#ffffff",
         display: "standalone",

    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },


      workbox: {
        runtimeCaching: [
          {
            // Static assets → Cache First
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|ico|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },

          {
            // Emergency API → Network First
            urlPattern: /\/api\/emergency\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "emergency-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
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