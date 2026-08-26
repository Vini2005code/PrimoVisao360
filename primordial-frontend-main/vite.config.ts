import path from "path"
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()], 
  worker: {
    format: "es",
  },
  server: {
    proxy: {
      "/primordial-data": "http://127.0.0.1:8000",
      "/static/primordial-data": "http://127.0.0.1:8000",
      "/voice": {
        target: "http://127.0.0.1:8000",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
