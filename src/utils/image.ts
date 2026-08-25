// Utilities for responsive images (Cloudinary removed)

type TransformOpts = {
  w?: number
  h?: number
  crop?: 'fill' | 'fit' | 'scale' | 'limit' | 'thumb' | 'fill_pad' | 'pad'
  dpr?: number | 'auto'
  quality?: number | 'auto' | 'auto:eco' | 'auto:good' | 'auto:best' | 'auto:low'
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif'
}

type ImageInput = string | { url?: string } | unknown

export function isCloudinaryUrl(url?: ImageInput): boolean {
  const targetUrl = typeof url === 'object' && url !== null && 'url' in url && typeof (url as { url?: string }).url === 'string' 
    ? (url as { url: string }).url 
    : url
  if (typeof targetUrl !== 'string' || !targetUrl) return false
  try {
    const { hostname } = new URL(targetUrl)
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

export function nonCdnSrcSet(url: string, widths: number[]): string | undefined {
  if (!url || widths.length === 0) return undefined
  // Check if we can optimize this URL
  const testUrl = nonCdnResponsiveUrl(url, 100)
  if (testUrl === url) return undefined // URL doesn't support optimizing

  const entries = widths.map(w => {
    const optimized = nonCdnResponsiveUrl(url, w)
    return `${optimized} ${w}w`
  })
  return entries.join(', ')
}

// For remote images, we can try to add width/quality hints in query if supported.
export function nonCdnResponsiveUrl(url: ImageInput, w?: number): string {
  const targetUrl = typeof url === 'object' && url !== null && 'url' in url && typeof (url as { url?: string }).url === 'string'
    ? (url as { url: string }).url
    : url
  if (typeof targetUrl !== 'string' || !targetUrl) return ''
  
  try {
    // Handle relative URLs (local API)
    if (targetUrl.startsWith('/api/images/') || targetUrl.startsWith('http')) {
      // If it's a full URL, check if it's our API
      let u: URL
      try {
        u = new URL(targetUrl, 'http://dummy.com') // Base for relative URLs
      } catch {
        return targetUrl
      }

      const isLocalApi = u.pathname.startsWith('/api/images/') || u.pathname.startsWith('/api/')

      if (isLocalApi && w) {
        // If relative, we just append query. If absolute, we reconstruct.
        if (targetUrl.startsWith('/')) {
          const separator = targetUrl.includes('?') ? '&' : '?'
          return `${targetUrl}${separator}w=${w}`
        }
        u.searchParams.set('w', String(w))
        return u.toString()
      }

      // Basic support for Unsplash-style params
      if (/images\.unsplash\.com$/.test(u.hostname)) {
        if (w) u.searchParams.set('w', String(w))
        u.searchParams.set('q', '80')
        u.searchParams.set('auto', 'format')
        return u.toString()
      }
    }
  } catch (error) {
    console.debug('nonCdnResponsiveUrl: fallback to original URL', error)
  }
  return targetUrl
}

type ResponsiveImageOptions = { widths?: number[]; sizes?: string; h?: number; crop?: TransformOpts['crop'] }

export function responsiveImageProps(url?: ImageInput, opts?: ResponsiveImageOptions) {
  const targetUrl = typeof url === 'object' && url !== null && 'url' in url && typeof (url as { url?: string }).url === 'string'
    ? (url as { url: string }).url
    : url
  if (typeof targetUrl !== 'string' || !targetUrl) return { src: undefined, srcSet: undefined, sizes: undefined as string | undefined }

  // Use more efficient default steps and sizes for a typical grid
  const widths = opts?.widths ?? [320, 640, 800, 1024, 1280]
  const sizes = opts?.sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

  if (isCloudinaryUrl(targetUrl)) {
    const src = cloudinaryTransform(targetUrl, { w: Math.max(...widths), h: opts?.h, crop: opts?.crop, format: 'auto', quality: 'auto:good' })
    const srcSet = cloudinarySrcSet(targetUrl, widths, { h: opts?.h, crop: opts?.crop, format: 'auto', quality: 'auto:good' })
    return { src, srcSet, sizes }
  }

  // Non-Cloudinary: best effort using query parameters
  // Ensure the fallback src isn't unnecessarily large on mobile
  // Since Lighthouse complained about 800w on mobile, let's make the fallback src the medium size instead of the max width. Wait, `src` is usually the fallback for old browsers, so 800 is okay, but `sizes` is what modern browsers use.
  const fallbackWidth = widths.length > 2 ? widths[Math.floor(widths.length / 2)] : Math.max(...widths)
  const src = nonCdnResponsiveUrl(targetUrl, fallbackWidth)
  const srcSet = nonCdnSrcSet(targetUrl, widths)
  return { src, srcSet, sizes }
}

export default { isCloudinaryUrl, cloudinaryTransform, cloudinarySrcSet, nonCdnResponsiveUrl, responsiveImageProps }
