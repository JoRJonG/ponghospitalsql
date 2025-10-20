// Cache regex patterns for performance
const INVALID_FILENAME_CHARS = /[\x00-\x1f<>:"/\\|?*\u0000-\u001F]/g;
const NON_ASCII_CHARS = /[^\x20-\x7E]/g;
const PATH_TRAVERSAL = /\.\./g;
const QUOTES_BACKSLASH = /["\\]/g;

export function decodeUploadFilename(original) {
  if (!original || typeof original !== 'string') return 'file';
  
  // Security: Limit input length to prevent DoS
  if (original.length > 1024) return 'file';
  
  try {
    return Buffer.from(original, 'latin1').toString('utf8');
  } catch {
    return original;
  }
}

export function sanitizeAsciiFallback(name) {
  if (!name || typeof name !== 'string') return 'file';
  
  // Performance: Early return for short strings
  if (name.length === 0) return 'file';
  
  const base = name.split(/[\\/]/).pop() || 'file';
  return base.replace(NON_ASCII_CHARS, '_') || 'file';
}

function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return 'file';
  
  // Security: Limit filename length
  if (name.length > 255) return 'file';
  
  // Performance: Early return for short strings
  if (name.length === 0) return 'file';
  
  // Extract filename from path
  const base = name.split(/[\\/]/).pop() || 'file';
  
  // Security: Prevent path traversal attacks
  const safeBase = base.replace(PATH_TRAVERSAL, '').replace(/^\.+/, '');
  
  // Remove invalid characters and trim
  return safeBase.replace(INVALID_FILENAME_CHARS, '').trim() || 'file';
}

function encodeRFC5987(value) {
  if (!value || typeof value !== 'string') return '';
  
  // Performance: Use built-in encodeURIComponent with minimal replacements
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function contentDisposition(type, originalName) {
  if (!type || typeof type !== 'string') return 'attachment; filename="file"';
  
  const sanitized = sanitizeFilename(originalName);
  const encoded = encodeRFC5987(sanitized);
  
  // Security: Sanitize fallback filename more thoroughly
  const fallback = sanitized.replace(QUOTES_BACKSLASH, '').replace(NON_ASCII_CHARS, '_') || 'file';
  
  // Performance: Use template literals for better readability
  let header = `${type}; filename="${fallback}"`;
  if (encoded) {
    header += `; filename*=UTF-8''${encoded}`;
  }
  return header;
}
