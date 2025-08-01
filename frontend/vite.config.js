import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from various domains
    host: true, // This allows external access
    // Optional: Configure CORS headers if needed
    cors: true,
    // Ensure the dev server works with proxies/tunnels
    strictPort: false
  }
})
