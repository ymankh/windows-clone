import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "shadcn-editor": path.resolve(__dirname, "./src/shadcn-editor"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-vendor";
          if (id.includes("@radix-ui")) return "ui-vendor";
          if (id.includes("framer-motion") || id.includes("/motion/")) return "motion-vendor";
          if (id.includes("zustand") || id.includes("immer") || id.includes("zod")) {
            return "state-vendor";
          }
          if (id.includes("lucide-react")) return "icons-vendor";
        },
      },
    },
  },
})
