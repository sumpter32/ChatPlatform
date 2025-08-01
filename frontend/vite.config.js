import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from Cloudflare Zero Trust tunnel
    host: true, // This allows external access
    allowedHosts: [
      'jesus.stevensumpter.com', // Your Cloudflare tunnel domain
      'localhost',
      '127.0.0.1',
      '.stevensumpter.com' // Allow all subdomains of stevensumpter.com
    ],
    // Optional: Configure CORS headers if needed
    cors: true,
    // Ensure the dev server works with proxies/tunnels
    strictPort: false,
    // Configure HMR for tunnel access
    hmr: {
      clientPort: 443, // Use HTTPS port for tunnel
      host: 'jesus.stevensumpter.com'
    }
  }
})
