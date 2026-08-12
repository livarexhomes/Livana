// Vercel catch-all serverless entry for Livana API routes.
// This keeps the deployment under the Hobby-plan function limit by having
// a single serverless function handle all route paths.

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const handlers = {
  chat: () => import('../server/api-handlers/chat.js'),
  'create-chat-ticket': () => import('../server/api-handlers/create-chat-ticket.js'),
  'get-chat-messages': () => import('../server/api-handlers/get-chat-messages.js'),
  'send-chat-message': () => import('../server/api-handlers/send-chat-message.js'),
  'clear-chat-messages': () => import('../server/api-handlers/clear-chat-messages.js'),
  'clear-all-chats': () => import('../server/api-handlers/clear-all-chats.js'),
  'delete-user': () => import('../server/api-handlers/delete-user.js'),
  'landlord-register': () => import('../server/api-handlers/landlord-register.js'),
  'manage-support-agent': () => import('../server/api-handlers/manage-support-agent.js'),
  'notify-kyc-reset': () => import('../server/api-handlers/notify-kyc-reset.js'),
  'notify-signup': () => import('../server/api-handlers/notify-signup.js'),
  'register-support-agent': () => import('../server/api-handlers/register-support-agent.js'),
  'send-confirmation': () => import('../server/api-handlers/send-confirmation.js'),
  'send-otp': () => import('../server/api-handlers/send-otp.js'),
  'send-password-reset': () => import('../server/api-handlers/send-password-reset.js'),
  'send-support-notification': () => import('../server/api-handlers/send-support-notification.js'),
  'support-presence': () => import('../server/api-handlers/support-presence.js'),
  'verify-otp': () => import('../server/api-handlers/verify-otp.js'),
  'verify-reset': () => import('../server/api-handlers/verify-reset.js'),
  'whatsapp/notify-inspection': () => import('../server/api-handlers/whatsapp/notify-inspection.js'),
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
