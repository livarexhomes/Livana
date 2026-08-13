/**
 * Emits the canonical list of /properties-in/:slug routes (one per state +
 * neighbourhood in NIGERIAN_STATES / POPULAR_AREAS) as JSON, so the plain
 * Node prerender.mjs script can consume it without needing a TS loader
 * registered for the whole process (which conflicts with importing the
 * already-built entry-server.js SSR bundle — see prerender.mjs).
 *
 * Run via tsx: node --import tsx scripts/build-location-slugs.mjs
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allLocationSlugs } from '../artifacts/property-manager/src/lib/locationSlug.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(__dirname, 'location-slugs.json')

writeFileSync(outPath, JSON.stringify(allLocationSlugs(), null, 2) + '\n')
console.log(`Wrote ${outPath}`)
