import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 'a', 'p', 'br', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'img', 'span', 'div',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt'],
  span: ['class'],
  div: ['class'],
};

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}

export function sanitizePlain(input: string): string {
  if (!input) return '';
  return sanitizeHtmlLib(input, { allowedTags: [], allowedAttributes: {} }).trim();
}
