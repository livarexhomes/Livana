/**
 * Build-time static prerender script for LIVAREX.
 * Generates pre-rendered HTML for key public routes so Google sees full content.
 *
 * Run after:  vite build && vite build --ssr src/entry-server.tsx
 * Command:    node scripts/prerender.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../artifacts/property-manager')

const ROUTES = [
  '/',
  '/listings',
  '/about',
  '/contact',
  '/terms',
  '/privacy-policy',
]

async function prerender() {
  const templatePath = resolve(projectRoot, 'dist/public/index.html')
  const template = readFileSync(templatePath, 'utf-8')

  const serverBundle = resolve(projectRoot, 'dist/server/entry-server.js')
  const { render } = await import(serverBundle)

  let succeeded = 0
  let failed = 0

  for (const route of ROUTES) {
    try {
      const { html, helmet } = render(route)

      const headParts = helmet
        ? [
            helmet.title?.toString() ?? '',
            helmet.meta?.toString() ?? '',
            helmet.link?.toString() ?? '',
            helmet.script?.toString() ?? '',
          ].filter(Boolean)
        : []

      let finalHtml = template

      if (headParts.length) {
        finalHtml = finalHtml.replace('</head>', `${headParts.join('\n')}\n</head>`)
      }

      finalHtml = finalHtml.replace(
        '<div id="root"></div>',
        `<div id="root">${html}</div>`
      )

      const outputPath =
        route === '/'
          ? resolve(projectRoot, 'dist/public/index.html')
          : resolve(projectRoot, `dist/public${route}/index.html`)

      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, finalHtml, 'utf-8')

      console.log(`  ✓  ${route}`)
      succeeded++
    } catch (err) {
      console.warn(`  ✗  ${route}  (${err.message})`)
      failed++
    }
  }

  console.log(`\nPrerender complete — ${succeeded} ok, ${failed} failed.`)
}

prerender().catch((err) => {
  console.error('Prerender script failed:', err)
  process.exit(1)
})
