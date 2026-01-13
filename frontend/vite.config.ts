import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': `http://localhost:${process.env.VITE_API_PORT || 3333}`,
      '/socket.io': {
        target: `http://localhost:${process.env.VITE_API_PORT || 3333}`,
        ws: true
      }
    }
  }
})
