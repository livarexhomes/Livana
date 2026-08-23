import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router, Switch, Route } from 'wouter'
import { TooltipProvider } from './components/ui/tooltip'

import HomePage from './pages/HomePage'
import LaunchPage from './pages/LaunchPage'
import ListingsPage from './pages/ListingsPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import CookiePolicyPage from './pages/CookiePolicyPage'
import HowWeVerifyPage from './pages/HowWeVerifyPage'
import SEO from './components/SEO'
import { slugToLocationLabel } from './lib/locationSlug'
import { getLocationImage } from './lib/locationImages'

// Renders a real, crawlable landing page (with location-specific <SEO/>) for
// /properties-in/:slug. The client-side router redirects this route straight
// to /listings?city=..., but that redirect only happens once JS has loaded —
// crawlers such as WhatsApp/Twitter/Facebook read the prerendered HTML for
// this exact URL, so the correct title/description/og:image must live here.
function LocationLanding({ slug }: { slug: string }) {
  const label = slugToLocationLabel(slug)
  const listingsUrl = `/listings?city=${encodeURIComponent(label)}`
  return (
    <>
      <SEO
        title={`${label} properties — Verified listings`}
        description={`Browse verified rental and lease properties in ${label}. Every landlord is vetted, every listing is real.`}
        url={`/properties-in/${slug}`}
        image={getLocationImage(label)}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties in {label}</h1>
          <p className="mt-2 text-gray-600">Redirecting you to verified listings in {label}…</p>
          <a href={listingsUrl} className="mt-4 inline-block text-blue-600 hover:underline">
            View listings in {label} →
          </a>
        </div>
      </div>
    </>
  )
}

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
              <Route path="/" component={__LAUNCH_MODE__ ? LaunchPage : HomePage} />
              <Route path="/listings" component={ListingsPage} />
              <Route path="/properties-in/:slug">
                {(params: { slug?: string }) => <LocationLanding slug={params?.slug ?? ''} />}
              </Route>
              <Route path="/how-we-verify" component={HowWeVerifyPage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/privacy-policy" component={PrivacyPage} />
              <Route path="/cookie-policy" component={CookiePolicyPage} />
              <Route component={NotFound} />
            </Switch>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )

  return { html, helmet: (helmetContext as any).helmet }
}
