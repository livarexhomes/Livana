'use client'

// Next.js navigation compatibility layer (replaces wouter)
export { useRouter, usePathname, useSearchParams, useParams, redirect } from 'next/navigation'
export { default as Link } from 'next/link'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Wouter-compatible useLocation hook.
 * Returns [location, navigate] where location is pathname + search.
 */
export function useLocation(): [string, (url: string) => void] {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const location = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '')

  const navigate = useCallback((url: string) => {
    router.push(url)
  }, [router])

  return [location, navigate]
}

/**
 * Wouter-compatible useSearch hook.
 * Returns the raw search string (e.g. "?foo=bar").
 */
export function useSearch(): string {
  const searchParams = useSearchParams()
  return searchParams?.toString() ? '?' + searchParams.toString() : ''
}
