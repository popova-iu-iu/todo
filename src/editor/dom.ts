/** Подготовка и очистка DOM документа заметки. */

/** Включить редактирование: блоки целиком не редактируются, только их текстовые части. */
export function prepare(doc: HTMLElement) {
  doc.contentEditable = 'true';
  doc.querySelectorAll<HTMLElement>('[data-block]').forEach((b) => (b.contentEditable = 'false'));
  doc.querySelectorAll<HTMLElement>('[data-block] .e').forEach((e) => (e.contentEditable = 'true'));
  doc.querySelectorAll<HTMLElement>('.wl').forEach((a) => (a.contentEditable = 'false'));
  doc.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((i) => (i.checked = i.hasAttribute('checked')));
}

/** Копия без служебного: атрибуты редактирования, стили анимаций, адреса картинок. */
export function cleanClone(el: HTMLElement): HTMLElement {
  const c = el.cloneNode(true) as HTMLElement;
  const live = [...el.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
  c.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((i, k) => {
    if (live[k]?.checked) i.setAttribute('checked', ''); else i.removeAttribute('checked');
  });
  if (el instanceof HTMLInputElement && el.checked) c.setAttribute('checked', '');
  c.querySelectorAll('.swdel').forEach((x) => x.remove());
  [c, ...c.querySelectorAll<HTMLElement>('*')].forEach((n) => {
    n.removeAttribute('contenteditable');
    n.removeAttribute('style');
    if (n.tagName === 'IMG') n.removeAttribute('src');
  });
  return c;
}

export function serialize(doc: HTMLElement): string {
  return cleanClone(doc).innerHTML;
}

export const topLevel = (doc: HTMLElement, n: Node | null): HTMLElement | null => {
  let el: Node | null = n;
  while (el && el.parentNode !== doc) el = el.parentNode;
  return el && el.nodeType === 1 ? (el as HTMLElement) : null;
};

const isEmptyText = (el: HTMLElement) => (el.textContent || '').replace(/​/g, '') === '' && !el.querySelector('img,input,.wl');

/**
 * Держать структуру в порядке после ввода:
 * первым идёт <h1>, текст на верхнем уровне — в <p>, в конце после блока — пустой абзац,
 * пустые элементы — по-настоящему пустые, чтобы снова появилась серая подсказка.
 */
export function normalize(doc: HTMLElement) {
  // текст и <br> прямо в документе → в абзацы
  [...doc.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      if (!(n.textContent || '').trim()) { n.remove(); return; }
      const p = document.createElement('p');
      doc.insertBefore(p, n);
      p.append(n);
    } else if (n.nodeType === 1) {
      const el = n as HTMLElement;
      if (el.tagName === 'BR') el.remove();
      else if (el.tagName === 'DIV' && !el.dataset.block && !el.classList.contains('swdel')) {
        const p = document.createElement('p');
        p.innerHTML = el.innerHTML;
        el.replaceWith(p);
      }
    } else n.remove();
  });
  let h1 = doc.firstElementChild;
  if (!h1 || h1.tagName !== 'H1') {
    const found = doc.querySelector(':scope > h1');
    h1 = found || document.createElement('h1');
    if (!found) h1.setAttribute('data-ph', 'Название');
    doc.prepend(h1);
  }
  const kids = [...doc.children].filter((c) => !c.classList.contains('swdel')) as HTMLElement[];
  if (kids.length < 2 || kids[kids.length - 1].dataset.block) doc.append(document.createElement('p'));
  // повторённая при Enter подсказка — убрать
  let prev: HTMLElement | null = null;
  for (const el of doc.children as unknown as HTMLElement[]) {
    if (prev && el.dataset.ph && el.dataset.ph === prev.dataset.ph && el.tagName === prev.tagName) el.removeAttribute('data-ph');
    prev = el;
  }
  // пустой элемент: либо совсем пустой, либо один <br> (в него можно поставить курсор)
  doc.querySelectorAll<HTMLElement>('h1,h2,p,.e').forEach((el) => {
    if (isEmptyText(el) && el.innerHTML !== '' && el.innerHTML !== '<br>') el.innerHTML = '<br>';
  });
}

export function placeCaret(el: HTMLElement, atEnd = false) {
  if (!el.firstChild) el.append(document.createElement('br'));
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(!atEnd);
  const s = getSelection()!;
  s.removeAllRanges();
  s.addRange(r);
  if (el.isContentEditable && el.contentEditable === 'true') el.focus({ preventScroll: true });
}
