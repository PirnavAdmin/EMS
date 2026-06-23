import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Optimization: strip debugger statements in production while keeping opt-in timing logs available.
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
  },
  build: {
    target: ["es2019", "edge88", "firefox78", "safari14"],
    cssTarget: ["edge88", "firefox78", "safari14"],
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Optimization: stable vendor chunks improve first load and browser cache reuse.
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react-router")) {
            return "router";
          }

          if (id.includes("react-icons") || id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("react-calendar") || id.includes("react-datepicker")) {
            return "forms";
          }

          return "vendor";
        },
      },
    },
  },
}))
