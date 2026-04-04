/* global process */
import path from 'path'
import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import JsdomRenderer from '@prerenderer/renderer-jsdom'
import vitePrerender from 'vite-plugin-prerender-esm-fix'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vitePrerender({
      // Generate real HTML for crawlers (especially `/`).
      staticDir: path.join(process.cwd(), 'dist'),
      routes: ['/', '/privacy'],
      server: {
        host: '127.0.0.1',
        port: 13010,
      },
      // The jsdom prerenderer can miss `DOMContentLoaded` for SPA+module scripts.
      // Capturing after a short delay avoids timeouts and the generic
      // "[vite-plugin-prerender] Unable to prerender all routes!" message.
      renderer: new JsdomRenderer({
        timeout: 10_000,
        renderAfterTime: 1500,
      }),
    }),
    {
      name: 'musicbox-sitemap-generator',
      apply: 'build',
      closeBundle() {
        const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:5173'
        const baseUrl = siteUrl.replace(/\/+$/, '')
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
</urlset>
`

        fs.writeFileSync(path.join(process.cwd(), 'dist', 'sitemap.xml'), sitemap, 'utf8')
      },
    },
  ],
})
