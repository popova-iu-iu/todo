import DOMPurify from 'dompurify';

/**
 * Очистка HTML заметки перед сохранением и после загрузки из копии:
 * вставленный или подменённый код не должен выполняться.
 * Разрешены только наши теги, классы и data-атрибуты; style, on*, href, src — запрещены.
 */
const TAGS = ['h1', 'h2', 'p', 'b', 'strong', 'i', 'em', 'br', 'div', 'span', 'a', 'blockquote', 'input', 'button', 'img'];
const ATTRS = ['class', 'data-ph', 'data-block', 'data-note', 'data-media', 'data-pick', 'type', 'checked', 'aria-label', 'alt'];

let hooked = false;
function hook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    const el = node as Element;
    if (data.tagName === 'input' && el.getAttribute('type') !== 'checkbox') el.remove();
    if (data.tagName === 'button') el.setAttribute('type', 'button');
  });
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    // id в data-атрибутах — только безопасные символы
    if ((data.attrName === 'data-note' || data.attrName === 'data-media') && !/^[A-Za-z0-9_-]{1,64}$/.test(data.attrValue)) {
      data.keepAttr = false;
    }
  });
}

export function sanitize(html: string): string {
  hook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAGS,
    ALLOWED_ATTR: ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
  }) as string;
}

/** Простой текст из HTML — для поиска. */
export function htmlToText(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('h1,h2,p,div,blockquote,.check').forEach((n) => n.append(' '));
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}
