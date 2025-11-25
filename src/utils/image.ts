// Utilities for responsive images (Cloudinary removed)

type TransformOpts = {
  w?: number
  h?: number
  crop?: 'fill' | 'fit' | 'scale' | 'limit' | 'thumb' | 'fill_pad' | 'pad'
  dpr?: number | 'auto'
  quality?: number | 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | 'auto:low'
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif'
}

export function isCloudinaryUrl(url?: string): boolean {
  if (!url) return false
  try {
    const { hostname } = new URL(url)
    return hostname.includes('res.cloudinary.com')
  } catch {
    return false
  }
}

// Apply a subset of Cloudinary-style transforms when the host matches; otherwise keep original URL.
export function cloudinaryTransform(url: string, opts: TransformOpts = {}): string {
  if (!isCloudinaryUrl(url)) return url
  const { w, h, crop, dpr, quality, format } = opts
  const segments = ['f_auto']
  if (w) segments.push(`w_${w}`)
  if (h) segments.push(`h_${h}`)
  if (crop) segments.push(`c_${crop}`)
  if (dpr) segments.push(`dpr_${dpr}`)
  if (quality) segments.push(`q_${quality}`)
  if (format) segments.push(`f_${format}`)

  try {
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split('/upload/')
    if (parts.length !== 2) return url
    urlObj.pathname = `${parts[0]}/upload/${segments.join(',')}/${parts[1]}`
    return urlObj.toString()
  } catch {
    return url
  }
}

export function cloudinarySrcSet(url: string, widths: number[], base: Omit<TransformOpts, 'w'> = {}): string | undefined {
  if (!isCloudinaryUrl(url) || widths.length === 0) return undefined
  const entries = widths.map((w) => `${cloudinaryTransform(url, { ...base, w })} ${w}w`)
  return entries.join(', ')
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
  } catch (error) {
    console.debug('nonCdnResponsiveUrl: fallback to original URL', error)
  }
  return url
}

type ResponsiveImageOptions = { widths?: number[]; sizes?: string; h?: number; crop?: TransformOpts['crop'] }

export function responsiveImageProps(url?: string, opts?: ResponsiveImageOptions) {
  const widths = opts?.widths ?? [320, 480, 640, 800, 1024, 1280]
  const sizes = opts?.sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
  if (!url) return { src: undefined, srcSet: undefined, sizes: undefined as string | undefined }

  if (isCloudinaryUrl(url)) {
    const src = cloudinaryTransform(url, { w: Math.max(...widths), h: opts?.h, crop: opts?.crop })
    const srcSet = cloudinarySrcSet(url, widths, { h: opts?.h, crop: opts?.crop })
    return { src, srcSet, sizes }
  }

  // Non-Cloudinary: best effort using query parameters
  const src = nonCdnResponsiveUrl(url, Math.max(...widths))
  return { src, srcSet: undefined, sizes }
}

export default { isCloudinaryUrl, cloudinaryTransform, cloudinarySrcSet, nonCdnResponsiveUrl, responsiveImageProps }
