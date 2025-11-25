export async function shareItem({ title, text, url }: { title?: string; text?: string; url: string; image?: string }) {
  // Define a typed navigator view for optional Web Share Level 2 methods
  type NavShare = {
    share?: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<void>
    canShare?: (data: { files?: File[] }) => boolean
  }

  const nav = (typeof navigator !== 'undefined' ? (navigator as unknown as NavShare) : undefined)

  // Try Web Share API (URL-only) synchronously to preserve the user gesture.
  // Avoid performing async network fetches here because awaiting breaks the
  // user gesture and causes NotAllowedError on many browsers.
  try {
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title, text, url })
        return
      } catch (error) {
        // Common: NotAllowedError when not called from a user gesture —
        // fall through to clipboard fallback. Log at debug level to avoid noisy errors.
        console.debug('Web Share API (URL-only) failed', error)
      }
    }
  } catch (error) {
    console.debug('Web Share API error', error)
  }

  // Clipboard fallback
  try {
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(url)
      // Friendly message in Thai
      alert('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว')
      return
    }
  } catch (error) {
    console.error('Clipboard write failed', error)
  }

  // Last resort: prompt so the user can copy manually
  try {
    // prompt is used as a last-resort UI for manual copy
    window.prompt('คัดลอกลิงก์นี้:', url)
  } catch {
    // ignore
  }
}
