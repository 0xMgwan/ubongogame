import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute site URL for link-preview tags (crawlers like WhatsApp need full URLs).
// SITE_URL wins; otherwise Vercel's production domain, which Vercel exposes at build time.
const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '')

export default defineConfig({
  plugins: [react(), { name: 'site-url', transformIndexHtml: html => html.replaceAll('%SITE_URL%', site) }],
  server: { proxy: { '/api': 'http://localhost:8790' } },
})
