/**
 * Assembles the Vercel Build Output API directory (.vercel/output).
 *
 * Emits:
 *   config.json                     — version 3 + routing rules
 *   static/                         — the prerendered SPA output
 *   functions/api/index.func/       — the single catch-all serverless function
 *
 * The catch-all function keeps the deployment under the Hobby-plan function
 * limit by handling every /api/* route via route-name parsing.
 */

import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const outputRoot = resolve(projectRoot, '.vercel/output')
const staticDir = resolve(outputRoot, 'static')
const funcDir = resolve(outputRoot, 'functions/api/index.func')

const PUBLIC_DIR = resolve(projectRoot, 'artifacts/property-manager/dist/public')
const API_ENTRY = resolve(projectRoot, 'api/[[...path]].js')
const HANDLERS_DIR = resolve(projectRoot, 'server/api-handlers')

function buildRoutes() {
  return [
    { handle: 'filesystem' },
    { src: '/api/(.*)', dest: '/api/index?path=$1' },
    { handle: 'miss' },
    { src: '/(.*)', dest: '/index.html' },
  ]
}

function assemble() {
  rmSync(outputRoot, { recursive: true, force: true })

  mkdirSync(staticDir, { recursive: true })
  cpSync(PUBLIC_DIR, staticDir, { recursive: true })

  mkdirSync(funcDir, { recursive: true })
  // The entrypoint imports handlers via '../server/api-handlers/...' relative
  // to the original api/[[...path]].js location. Inside the .func directory
  // the handlers sit at ./server/api-handlers/..., so rewrite the import path.
  const entrySource = readFileSync(API_ENTRY, 'utf-8')
    .replaceAll("'../server/api-handlers/", "'./server/api-handlers/")
  writeFileSync(resolve(funcDir, 'index.js'), entrySource)
  cpSync(HANDLERS_DIR, resolve(funcDir, 'server/api-handlers'), { recursive: true })

  // The handlers and entrypoint use ESM. The project root package.json is
  // commonjs, so declare ESM inside the .func directory where Node runs it.
  writeFileSync(
    resolve(funcDir, 'package.json'),
    JSON.stringify({ type: 'module', private: true }, null, 2) + '\n'
  )

  writeFileSync(
    resolve(funcDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
        maxDuration: 30,
      },
      null,
      2
    ) + '\n'
  )

  writeFileSync(
    resolve(outputRoot, 'config.json'),
    JSON.stringify({ version: 3, routes: buildRoutes() }, null, 2) + '\n'
  )

  console.log('✓ assembled .vercel/output')
  console.log(`  static:   ${staticDir}`)
  console.log(`  function: ${funcDir}`)
}

assemble()
