import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("pdfjs-dist")) return "pdf";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("papaparse")) return "csv";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("dexie")) return "db";
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("/react/")
          ) {
            return "react";
          }
          if (id.includes("date-fns")) return "dates";
          return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-is", "react-router-dom", "zustand", "dexie"],
    exclude: ["pdfjs-dist"],
  },
  worker: {
    format: "es",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "Taz.png"],
      manifest: {
        name: "Taz",
        short_name: "Taz",
        description:
          "Taz — privacy-first personal finance tracker that runs locally in your browser.",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/Taz.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/Taz.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/pdf.worker*.mjs"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [],
      },
    }),
  ],
});
