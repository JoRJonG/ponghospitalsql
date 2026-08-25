import sharp from 'sharp'
import fs from 'fs'

// Limit Sharp to a single thread to prevent CPU exhaustion on concurrent uploads
sharp.concurrency(1)
sharp.cache(false)

/**
 * Image optimization options
 * @typedef {Object} OptimizeOptions
 * @property {number} [maxWidth=1920] - Maximum width for resizing
 * @property {boolean} [convertToWebP=true] - Convert non-gif images to webp
 * @property {number} [quality=85] - WebP/JPEG quality
 */

/**
 * Optimize an image (supports both buffer and file path)
 * @param {Buffer|string} input - Image buffer or file path
 * @param {string} mimetype - Image mime type
 * @param {OptimizeOptions} [options] - Optimization options
 * @returns {Promise<{buffer: Buffer, mimetype: string}>} - Optimized buffer and new mime type
 */
export async function optimizeImage(input, mimetype, options = {}) {
  try {
    const isBuffer = Buffer.isBuffer(input)
    
    // For GIF files, don't optimize to preserve animation
    if (mimetype === 'image/gif') {
      const buffer = isBuffer ? input : await fs.promises.readFile(input)
      return { buffer, mimetype }
    }

    const { maxWidth = 1920, convertToWebP = true, quality = 85 } = options
    let pipeline = sharp(input)

    // Get image info
    const metadata = await pipeline.metadata()

    // Resize if too large (maintain aspect ratio)
    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true })
    }

    let finalMime = mimetype

    // Convert to WebP for better compression if specified
    if (convertToWebP && metadata.width && metadata.width > 100) {
      pipeline = pipeline.webp({ quality })
      finalMime = 'image/webp'
    } else {
      // For small images or when webp is disabled, keep original format but compress
      pipeline = pipeline.jpeg({ quality: Math.min(quality + 5, 100) })
      finalMime = 'image/jpeg'
    }

    const optimizedBuffer = await pipeline.toBuffer()
    return { buffer: optimizedBuffer, mimetype: finalMime }
  } catch (error) {
    console.warn('[imageOptimizer] Image optimization failed, using original:', error.message)
    if (Buffer.isBuffer(input)) {
      return { buffer: input, mimetype }
    } else {
      const buffer = await fs.promises.readFile(input)
      return { buffer, mimetype }
    }
  }
}
