import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
  schema?: object
  noIndex?: boolean
}

const BASE_URL = 'https://livarex.com.ng'
const DEFAULT_IMAGE = `${BASE_URL}/opengraph.jpg`
const SITE_NAME = 'LIVAREX'

export default function SEO({
  title,
  description = "Find verified homes, apartments and commercial properties for rent, lease and sale across Nigeria. Every landlord is vetted, every listing is real.",
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  schema,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | LIVAREX` : "LIVAREX — Nigeria's Verified Property Marketplace"
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  )
}
