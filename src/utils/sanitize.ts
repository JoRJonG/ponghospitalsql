import DOMPurify from 'dompurify'

// Sanitize HTML for safe rendering with dangerouslySetInnerHTML
export function sanitize(html?: string | null): { __html: string } {
  const clean = DOMPurify.sanitize(String(html || ''), {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href','src','alt','title','target','rel','class','style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
  })
  return { __html: clean }
}
