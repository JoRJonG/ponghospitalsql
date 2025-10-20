/**
 * ลดขนาดรูปภาพโดยอัตโนมัติ
 * @param file - ไฟล์รูปภาพต้นฉบับ
 * @param maxWidth - ความกว้างสูงสุด (default: 1200px)
 * @param quality - คุณภาพ JPEG 0-1 (default: 0.8)
 * @returns Promise<File> - ไฟล์รูปที่ลดขนาดแล้ว
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // ถ้าไฟล์เล็กกว่า 500KB ให้ผ่านไปเลย
    if (file.size < 500 * 1024) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // คำนวณขนาดใหม่โดยรักษา aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Cannot get canvas context'))
          return
        }
        
        // วาดรูปลงบน canvas
        ctx.drawImage(img, 0, 0, width, height)
        
        // แปลงเป็น Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            // สร้าง File object ใหม่
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            
            console.log(`[Compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
  })
}

/**
 * แปลงไฟล์เป็น base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Compress และแปลงเป็น base64 ในคำสั่งเดียว
 */
export async function compressAndEncode(
  file: File,
  maxWidth?: number,
  quality?: number
): Promise<string> {
  const compressed = await compressImage(file, maxWidth, quality)
  return fileToBase64(compressed)
}
