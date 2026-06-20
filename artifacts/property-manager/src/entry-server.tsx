import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router, Switch, Route } from 'wouter'
import { TooltipProvider } from './components/ui/tooltip'

import HomePage from './pages/HomePage'
import ListingsPage from './pages/ListingsPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">Go home</a>
      </div>
    </div>
  )
}

export function render(url: string): { html: string; helmet: unknown } {
  const helmetContext: Record<string, unknown> = {}
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, enabled: false, staleTime: Infinity },
    },
  })

  const staticHook = () => [url, () => {}] as [string, (path: string) => void]

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router hook={staticHook}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/listings" component={ListingsPage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/privacy-policy" component={PrivacyPage} />
              <Route component={NotFound} />
            </Switch>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )

  return { html, helmet: (helmetContext as any).helmet }
}
