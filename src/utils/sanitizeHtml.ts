export function sanitizeHtml(text: string): string {
  if (!text) return text;
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
  };
  return text.replace(/[&<>"'\/]/g, (m) => map[m]);
}
