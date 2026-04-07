export function generateSlug(id: string | number, title: string): string {
  if (!title) return String(id);
  
  // Replace spaces and special characters with hyphens
  // Allow Thai, English, and numbers
  const cleanTitle = title
    .replace(/[^\u0E00-\u0E7FA-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // remove leading/trailing hyphens
    .substring(0, 80); // keep it reasonable length, long enough for Thai titles
  
  if (!cleanTitle) return String(id);
  
  return `${id}-${cleanTitle}`;
}
