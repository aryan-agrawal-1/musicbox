import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

function toAbsoluteUrl(path) {
  try {
    // Ensure no double slashes and always return an absolute URL.
    const url = new URL(path, siteUrl)
    return url.toString()
  } catch {
    return siteUrl
  }
}

function buildCanonical(pathname) {
  const trimmed = pathname.replace(/\/+$/, '')
  const safePath = trimmed === '' ? '/' : trimmed
  return toAbsoluteUrl(safePath)
}

export default function Seo({
  title = 'Noted - Rate & review your music diary',
  description = 'Noted turns your listening history into a clean, scrollable diary so every song and album gets a rating and a review that helps you remember.',
  imagePath = '/og-cover.svg',
}) {
  const location = useLocation()
  const canonical = buildCanonical(location.pathname)
  const image = toAbsoluteUrl(imagePath)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Noted',
    applicationCategory: 'MusicApplication',
    operatingSystem: 'Web',
    description,
    url: canonical,
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <meta name="robots" content="index,follow" />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}

