// Twitter card — re-exports the OpenGraph image so both meta tags resolve to
// the same dynamic PNG. Next.js requires distinct filenames to emit both
// og:image and twitter:image; the implementation is identical.

export { default, alt, size, contentType, runtime } from './opengraph-image'
