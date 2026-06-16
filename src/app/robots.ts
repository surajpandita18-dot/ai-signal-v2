import type { MetadataRoute } from 'next'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Internal flows that shouldn't be indexed — preview routes, review
        // dashboard, unsubscribe links (which carry tokens), API.
        disallow: ['/api/', '/preview/', '/review/', '/unsubscribe'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
