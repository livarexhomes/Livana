// Vercel catch-all serverless entry for Livana API routes.
// This keeps the deployment under the Hobby-plan function limit by having
// a single serverless function handle all route paths.

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const handlers = {
  chat: () => import('../server/api-handlers/chat.js'),
  'landlord-register': () => import('../server/api-handlers/landlord-register.ts'),
  'manage-support-agent': () => import('../server/api-handlers/manage-support-agent.ts'),
  'notify-signup': () => import('../server/api-handlers/notify-signup.js'),
  'register-support-agent': () => import('../server/api-handlers/register-support-agent.ts'),
  'send-confirmation': () => import('../server/api-handlers/send-confirmation.ts'),
  'send-otp': () => import('../server/api-handlers/send-otp.ts'),
  'send-password-reset': () => import('../server/api-handlers/send-password-reset.ts'),
  'send-support-notification': () => import('../server/api-handlers/send-support-notification.ts'),
  'verify-otp': () => import('../server/api-handlers/verify-otp.ts'),
  'whatsapp/notify-inspection': () => import('../server/api-handlers/whatsapp/notify-inspection.ts'),
}

function getRouteName(req) {
  const pathQuery = req?.query?.path
  if (Array.isArray(pathQuery) && pathQuery.length) {
    const normalized = pathQuery.filter(Boolean).join('/')
    if (normalized) return normalized
  }

  if (typeof pathQuery === 'string' && pathQuery.trim()) {
    const normalized = pathQuery.replace(/^\/+/, '').replace(/\/+$/, '')
    if (normalized) return normalized
  }

  const pathname = req?.url ? new URL(req.url, 'http://localhost').pathname : '/'
  const normalized = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  const withoutApiPrefix = normalized.startsWith('api/') ? normalized.slice(4) : normalized
  if (!withoutApiPrefix) return 'chat'
  return withoutApiPrefix
}

export default async function handler(req, res) {
  const routeName = getRouteName(req)
  const handlerFactory = handlers[routeName]

  if (!handlerFactory) {
    return res.status(404).json({ error: 'Route not found' })
  }

  const mod = await handlerFactory()
  const fn = mod.default || mod.handler || mod
  if (typeof fn !== 'function') {
    return res.status(500).json({ error: 'No handler exported' })
  }
  return fn(req, res)
}
