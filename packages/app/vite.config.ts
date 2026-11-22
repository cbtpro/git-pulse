import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? process.env.GITPULSE_WEB_BASE || "/git-pulse/" : "/",
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    react(),
    {
      name: "gitpulse-dev-identity",
      apply: "serve",
      configureServer(server) {
        const workspace = createHash("sha256")
          .update(realpathSync(__dirname))
          .digest("hex")
          .slice(0, 20);
        server.middlewares.use("/__gitpulse_dev__", (_request, response) => {
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify({ name: "gitpulse", workspace }));
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },

  // Vite options tailored for Tauri to prevent too much memory consumption
  build: {
    target: ["es2020", "chrome97"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          arco: ["@arco-design/web-react"],
        },
      },
    },
  },

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is not available
  server: {
    host: process.env.TAURI_DEV_HOST || "0.0.0.0",
    port: 1420,
    strictPort: true,
    proxy: {
      "^/api/github/login/(device/code|oauth/access_token)$": {
        target: "https://github.com",
        changeOrigin: true,
        rewrite: (url) => url.replace("/api/github", ""),
        timeout: 20000,
        proxyTimeout: 20000,
      },
    },
    watch: {
      // Using polling since fsEvents doesn't work on all platforms
      usePolling: true,
      // Tauri watches Rust itself; polling native build outputs wastes CPU.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
