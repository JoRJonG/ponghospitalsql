import { v2 as cloudinary } from 'cloudinary'

export function configureCloudinary() {
  // Prefer CLOUDINARY_URL if provided
  if (process.env.CLOUDINARY_URL) {
    // Try to load from env
    cloudinary.config({ secure: true })
    const cfg = cloudinary.config()
    if (cfg && cfg.cloud_name) return true
    // Fallback: parse CLOUDINARY_URL manually: cloudinary://<key>:<secret>@<cloud>
    try {
      const url = process.env.CLOUDINARY_URL.replace('cloudinary://', '')
      const [creds, cloud] = url.split('@')
      const [api_key, api_secret] = creds.split(':')
      if (api_key && api_secret && cloud) {
        cloudinary.config({ cloud_name: cloud, api_key, api_secret, secure: true })
        return true
      }
    } catch {}
    console.warn('[cloudinary] CLOUDINARY_URL set but could not initialize config')
    return false
  }
  // Fallback to individual keys
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
    return true
  }
  console.warn('[cloudinary] Not configured. Set CLOUDINARY_URL or individual CLOUDINARY_* envs to enable uploads.')
  return false
}

export { cloudinary }
