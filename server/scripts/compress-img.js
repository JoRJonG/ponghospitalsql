import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.resolve(__dirname, '../../public/imgpong.png')
const outputPath = path.resolve(__dirname, '../../public/imgpong.webp')

async function compressImage() {
  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    return
  }

  try {
    const tempOutput = path.resolve(__dirname, '../../public/imgpong_compressed.png')
    await sharp(inputPath)
      .png({ quality: 80, compressionLevel: 8 })
      .toFile(tempOutput)
    fs.renameSync(tempOutput, inputPath)
    console.log('Successfully compressed imgpong.png in place')
    
    await sharp(inputPath)
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath)
    console.log('Successfully created imgpong.webp')
    
    // Compress imgpong.jpg
    const jpgInput = path.resolve(__dirname, '../../public/imgpong.jpg')
    if (fs.existsSync(jpgInput)) {
      const tempJpg = path.resolve(__dirname, '../../public/imgpong_compressed.jpg')
      await sharp(jpgInput)
        .jpeg({ quality: 80, progressive: true })
        .toFile(tempJpg)
      fs.renameSync(tempJpg, jpgInput)
      console.log('Successfully compressed imgpong.jpg in place')
      
      const webpJpg = path.resolve(__dirname, '../../public/imgpong-jpg.webp')
      await sharp(jpgInput)
        .webp({ quality: 80, effort: 6 })
        .toFile(webpJpg)
      console.log('Successfully created imgpong-jpg.webp')
    }
  } catch (err) {
    console.error('Error compressing image:', err)
  }
}

compressImage()
