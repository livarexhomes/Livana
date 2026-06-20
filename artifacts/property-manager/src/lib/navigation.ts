import { useLocation as useWouterLocation, useParams as useWouterParams, Link as WouterLink } from 'wouter'
import { useCallback } from 'react'

export { WouterLink as Link }

export function useRouter() {
  const [, navigate] = useWouterLocation()
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => history.back(),
    prefetch: () => {},
  }
}

export function usePathname(): string {
  const [loc] = useWouterLocation()
  return loc.split('?')[0]
}

export function useSearchParams() {
  const [loc] = useWouterLocation()
  const search = loc.includes('?') ? loc.slice(loc.indexOf('?') + 1) : ''
  const params = new URLSearchParams(search)
  return {
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
    has: (key: string) => params.has(key),
    getAll: (key: string) => params.getAll(key),
  }
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useWouterParams() as T
}

export function redirect(url: string) {
  window.location.href = url
}

export function useLocation(): [string, (url: string) => void] {
  const [loc, navigate] = useWouterLocation()
  const go = useCallback((url: string) => navigate(url), [navigate])
  return [loc, go]
}

export function useSearch(): string {
  const [loc] = useWouterLocation()
  return loc.includes('?') ? '?' + loc.slice(loc.indexOf('?') + 1) : ''
}
