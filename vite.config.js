import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Let a tunnel (localtunnel, localhost.run, cloudflared) reach the dev server so phones get https + camera.
  server: { allowedHosts: ['.loca.lt', '.lhr.life', '.trycloudflare.com'] },
})
