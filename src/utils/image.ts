// Utilities for responsive images (Cloudinary removed)

type TransformOpts = {
  w?: number
  h?: number
  crop?: 'fill' | 'fit' | 'scale' | 'limit' | 'thumb' | 'fill_pad' | 'pad'
  dpr?: number | 'auto'
  quality?: number | 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | 'auto:low'
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif'
}

export function isCloudinaryUrl(_url?: string): boolean {
  return false // Cloudinary removed
}

// Cloudinary transform removed - return original URL
export function cloudinaryTransform(url: string, _opts: TransformOpts = {}): string {
  return url
}

export function cloudinarySrcSet(_url: string, _widths: number[], _base: Omit<TransformOpts, 'w'> = {}): string | undefined {
  return undefined // Cloudinary removed
}

// For remote images, we can try to add width/quality hints in query if supported.
export function nonCdnResponsiveUrl(url: string, w?: number): string {
  try {
    const u = new URL(url)
    // Basic support for Unsplash-style params
    if (/images\.unsplash\.com$/.test(u.hostname)) {
      if (w) u.searchParams.set('w', String(w))
      u.searchParams.set('q', '80')
      u.searchParams.set('auto', 'format')
      return u.toString()
    }
  } catch {}
  return url
}

export function responsiveImageProps(url?: string, opts?: { widths?: number[]; sizes?: string; h?: number; crop?: TransformOpts['crop'] }) {
  const widths = opts?.widths ?? [320, 480, 640, 800, 1024, 1280]
  const sizes = opts?.sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
  if (!url) return { src: undefined as any, srcSet: undefined as any, sizes: undefined as any }

  // Non-Cloudinary: best effort
  const src = nonCdnResponsiveUrl(url, Math.max(...widths))
  return { src, srcSet: undefined, sizes }
}

export default { isCloudinaryUrl, cloudinaryTransform, cloudinarySrcSet, nonCdnResponsiveUrl, responsiveImageProps }
