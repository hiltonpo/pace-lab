import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "pace-lab",
        short_name: "pace-lab",
        description: "Marathon training plan generator and tracker",
        theme_color: "#1e2a4a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/paceLab_logo_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/paceLab_logo_512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // 靜態資源（JS/CSS/圖片/字型）自動 precache
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        //  新 SW 立刻取代舊的
        skipWaiting: true, 

        // 立刻接管所有分頁
        clientsClaim: true,

        // API 請求的 runtime 快取策略
        runtimeCaching: [
          {
            // 你的後端 API
            urlPattern: ({ url }) =>
              url.origin === "https://pace-labapi-production.up.railway.app",
            handler: "NetworkFirst", // API 用網路優先
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 快取 1 天
              },
              cacheableResponse: {
                statuses: [0, 200], // 只快取成功的
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
