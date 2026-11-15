import { BLOCKS, blockLabel } from './blocks';
import { cleanClone, normalize, placeCaret, prepare, serialize, topLevel } from './dom';
import { chooseNote } from './linkSheet';
import { pickPhoto, resolveImages, setImage } from './photos';
import { hideMenu, setSelectionTarget } from './selectionMenu';
import { attachSwipe } from './swipe';
import { toast } from '../ui/overlay';

export interface EditorOpts {
  doc: HTMLElement;
  /** контейнер прокрутки — туда кладётся кнопка «Удалить» */
  host: HTMLElement;
  noteId: string;
  onChange: () => void;
  onBlockDeleted: (label: string, html: string, index: number, undo: () => void) => void;
  openNote: (id: string) => void;
  createLinkedNote: (word: string) => Promise<string>;
}

export interface Editor {
  insertBlock(i: number): void;
  html(): string;
  destroy(): void;
}

/**
 * Редактор без режима «Изменить»: нажал на текст — пишешь. Сохраняется само (onChange).
 */
export function mountEditor(o: EditorOpts): Editor {
  const { doc } = o;
  prepare(doc);
  normalize(doc);
  let freeImages: () => void = () => {};
  resolveImages(doc).then((f) => (freeImages = f));
  let lastTop: HTMLElement | null = null;
  let lastEnter = 0, lastBack = 0;

  const sel = () => getSelection();
  const caretEl = (): HTMLElement | null => {
    const s = sel();
    if (!s || !s.rangeCount) return null;
    const n = s.anchorNode;
    return n ? ((n.nodeType === 1 ? n : n.parentElement) as HTMLElement) : null;
  };
  const atStart = (el: HTMLElement) => {
    const s = sel();
    if (!s || !s.rangeCount || !s.isCollapsed) return false;
    const r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(s.anchorNode!, s.anchorOffset);
    return r.toString() === '' && !r.cloneContents().querySelector?.('img,.wl');
  };
  const empty = (el: HTMLElement) => !(el.textContent || '').trim() && !el.querySelector('img,.wl');

  function newCheckItem(after: HTMLElement) {
    const item = document.createElement('div');
    item.className = 'check';
    item.innerHTML = '<input type="checkbox"><span class="e"></span>';
    after.after(item);
    const e = item.querySelector<HTMLElement>('.e')!;
    e.contentEditable = 'true';
    placeCaret(e);
  }

  function handleEnter(ev: Event) {
    const el = caretEl();
    if (!el || !doc.contains(el)) return;
    const top = topLevel(doc, el);
    const part = el.closest<HTMLElement>('.e');
    if (top && top.tagName === 'H1') {
      ev.preventDefault();
      let next = top.nextElementSibling as HTMLElement | null;
      if (!next || next.tagName !== 'P') {
        next = document.createElement('p');
        top.after(next);
      }
      placeCaret(next);
      return;
    }
    if (!part) return;
    ev.preventDefault();
    const item = part.closest<HTMLElement>('.check');
    if (item) {
      const list = item.parentElement!;
      if (empty(part) && item === list.lastElementChild && list.children.length > 1) {
        // пустой последний пункт + Enter — выйти из списка
        item.remove();
        let p = list.nextElementSibling as HTMLElement | null;
        if (!p || p.tagName !== 'P') { p = document.createElement('p'); list.after(p); }
        placeCaret(p);
      } else newCheckItem(item);
      o.onChange();
      return;
    }
    if (part.classList.contains('ct') || part.classList.contains('cd')) return; // в карточках — одна строка
    document.execCommand('insertLineBreak');
  }

  function handleBackspace(ev: Event) {
    const el = caretEl();
    if (!el || !doc.contains(el)) return;
    const part = el.closest<HTMLElement>('.e');
    if (part) {
      if (!atStart(part)) return;
      ev.preventDefault();
      const item = part.closest<HTMLElement>('.check');
      if (item && empty(part) && item.parentElement!.children.length > 1) {
        const prev = (item.previousElementSibling || item.nextElementSibling) as HTMLElement;
        item.remove();
        placeCaret(prev.querySelector<HTMLElement>('.e')!, true);
        o.onChange();
      }
      return;
    }
    const top = topLevel(doc, el);
    if (!top || top.tagName === 'H1' || !atStart(top)) return;
    const prev = top.previousElementSibling as HTMLElement | null;
    if (prev && prev.dataset.block) {
      // не «вклеивать» абзац в блок
      ev.preventDefault();
      if (empty(top) && top.nextElementSibling) top.remove();
      const parts = prev.querySelectorAll<HTMLElement>('.e');
      if (parts.length) placeCaret(parts[parts.length - 1], true);
      o.onChange();
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { lastEnter = Date.now(); handleEnter(e); }
    else if (e.key === 'Backspace') { lastBack = Date.now(); handleBackspace(e); }
  };
  // запасной путь для клавиатур, которые не присылают keydown
  const onBeforeInput = (e: InputEvent) => {
    if (e.inputType === 'insertParagraph' && Date.now() - lastEnter > 60) handleEnter(e);
    if (e.inputType === 'deleteContentBackward' && Date.now() - lastBack > 60) handleBackspace(e);
  };

  const onInput = () => {
    const s = sel();
    const anchor = s && s.rangeCount ? { n: s.anchorNode, o: s.anchorOffset } : null;
    normalize(doc);
    if (anchor?.n && doc.contains(anchor.n) && s) {
      try { s.collapse(anchor.n, Math.min(anchor.o, anchor.n.nodeType === 3 ? (anchor.n.textContent || '').length : anchor.n.childNodes.length)); } catch { /* узел исчез */ }
    } else if (anchor?.n) {
      const el = caretEl();
      if (!el || !doc.contains(el)) {
        const lastTopEl = lastTop && doc.contains(lastTop) ? lastTop : null;
        if (lastTopEl) placeCaret(lastTopEl, true);
      }
    }
    o.onChange();
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) document.execCommand('insertText', false, text);
  };
  const onDrop = (e: DragEvent) => e.preventDefault();

  const onClick = async (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const link = t.closest<HTMLElement>('.wl');
    if (link && link.dataset.note) { e.preventDefault(); o.openNote(link.dataset.note); return; }
    const mood = t.closest<HTMLElement>('.mood');
    if (mood) {
      mood.parentElement!.querySelectorAll('.mood').forEach((m) => m.classList.toggle('on', m === mood && !mood.classList.contains('on')));
      o.onChange();
      return;
    }
    const pick = t.closest<HTMLElement>('[data-pick], .photo img, .gallery img');
    if (pick) {
      e.preventDefault();
      const id = await pickPhoto();
      if (!id) return;
      let img: HTMLImageElement;
      if (pick.tagName === 'IMG') img = pick as HTMLImageElement;
      else { img = document.createElement('img'); img.alt = ''; pick.replaceWith(img); }
      await setImage(img, id);
      o.onChange();
    }
  };
  const onChangeEv = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'checkbox') { t.toggleAttribute('checked', t.checked); o.onChange(); }
  };
  const onSel = () => {
    const el = caretEl();
    if (el && doc.contains(el)) lastTop = topLevel(doc, el);
  };

  doc.addEventListener('keydown', onKey);
  doc.addEventListener('beforeinput', onBeforeInput);
  doc.addEventListener('input', onInput);
  doc.addEventListener('paste', onPaste);
  doc.addEventListener('drop', onDrop);
  doc.addEventListener('click', onClick);
  doc.addEventListener('change', onChangeEv);
  document.addEventListener('selectionchange', onSel);

  // меню выделения: Жирный · Заголовок · Связать
  const rangeTops = (r: Range) => [topLevel(doc, r.startContainer), topLevel(doc, r.endContainer)];
  setSelectionTarget({
    doc,
    bold: () => { document.execCommand('bold'); o.onChange(); },
    canHeading: (r) => {
      const [a, b] = rangeTops(r);
      return !!a && a === b && (a.tagName === 'P' || a.tagName === 'H2');
    },
    heading: () => {
      const s = sel();
      if (!s || !s.rangeCount) return;
      const [a] = rangeTops(s.getRangeAt(0));
      if (!a) return;
      document.execCommand('formatBlock', false, a.tagName === 'H2' ? 'p' : 'h2');
      normalize(doc);
      o.onChange();
    },
    link: async (r) => {
      const word = r.toString().trim();
      const [a, b] = rangeTops(r);
      const anc = r.commonAncestorContainer;
      const ancEl = (anc.nodeType === 1 ? anc : anc.parentElement) as HTMLElement;
      if (!word || !a || a !== b || a.tagName === 'H1' || ancEl.closest('.wl') || r.cloneContents().querySelector('.wl,div,p,h2')) {
        hideMenu();
        toast('Выделите слово или фразу внутри одного абзаца');
        return;
      }
      const choice = await chooseNote(word, o.noteId);
      hideMenu();
      if (!choice) return;
      const id = choice === 'new' ? await o.createLinkedNote(word) : choice.id;
      const link = document.createElement('a');
      link.className = 'wl';
      link.dataset.note = id;
      link.contentEditable = 'false';
      link.textContent = r.toString();
      r.deleteContents();
      r.insertNode(link);
      if (!link.nextSibling) link.after(document.createTextNode(' '));
      sel()?.removeAllRanges();
      o.onChange();
      toast(`«${word.slice(0, 30)}» теперь ссылка`);
    },
  });

  // свайп влево — удалить блок (название заметки так не удаляется)
  const detachSwipe = attachSwipe(o.host, {
    pick: (t) => {
      if (!doc.contains(t)) return null;
      const top = topLevel(doc, t);
      return top && top.tagName !== 'H1' ? top : null;
    },
    onSwipeStart: hideMenu,
    onDelete: (el) => {
      const index = [...doc.children].indexOf(el);
      const clone = cleanClone(el);
      const label = blockLabel(el);
      el.remove();
      normalize(doc);
      o.onChange();
      o.onBlockDeleted(label, clone.outerHTML, index, () => {
        const back = clone.cloneNode(true) as HTMLElement;
        doc.insertBefore(back, doc.children[index] || null);
        prepare(doc);
        normalize(doc);
        resolveImages(back);
        o.onChange();
      });
    },
  });

  return {
    insertBlock(i: number) {
      const tmp = document.createElement('div');
      tmp.innerHTML = BLOCKS[i].html();
      const el = tmp.firstElementChild as HTMLElement;
      let ref = lastTop && doc.contains(lastTop) ? lastTop : null;
      if (ref && ref.tagName === 'P' && empty(ref) && !ref.dataset.ph && ref.previousElementSibling) ref.before(el);
      else if (ref) ref.after(el);
      else doc.append(el);
      prepare(doc);
      normalize(doc);
      const focus = el.tagName === 'H2' ? el : el.querySelector<HTMLElement>('.e');
      if (focus) placeCaret(focus);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lastTop = el;
      o.onChange();
    },
    html: () => serialize(doc),
    destroy() {
      doc.removeEventListener('keydown', onKey);
      doc.removeEventListener('beforeinput', onBeforeInput);
      doc.removeEventListener('input', onInput);
      doc.removeEventListener('paste', onPaste);
      doc.removeEventListener('drop', onDrop);
      doc.removeEventListener('click', onClick);
      doc.removeEventListener('change', onChangeEv);
      document.removeEventListener('selectionchange', onSel);
      setSelectionTarget(null);
      detachSwipe();
      freeImages();
    },
  };
}

/**
 * Режим шаблона: всё, что вписано в страницу, становится серыми подсказками.
 * Заголовки разделов остаются заголовками.
 */
export function toTemplateHtml(doc: HTMLElement): string {
  const c = cleanClone(doc);
  const h1 = c.querySelector('h1');
  if (h1) { h1.textContent = ''; h1.setAttribute('data-ph', 'Название'); }
  c.querySelectorAll<HTMLElement>(':scope > p, .e').forEach((el) => {
    const t = (el.textContent || '').trim();
    if (t) el.setAttribute('data-ph', t);
    else if (el.parentElement === c) el.removeAttribute('data-ph');
    el.innerHTML = '';
  });
  c.querySelectorAll('input[type=checkbox]').forEach((i) => i.removeAttribute('checked'));
  c.querySelectorAll('.mood.on').forEach((m) => m.classList.remove('on'));
  c.querySelectorAll('img').forEach((img) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ph-photo';
    b.setAttribute('data-pick', '');
    b.textContent = 'Фото';
    img.replaceWith(b);
  });
  // пустые абзацы без подсказки в конце не нужны
  while (c.lastElementChild && c.lastElementChild.tagName === 'P' && !c.lastElementChild.getAttribute('data-ph') && c.children.length > 2) c.lastElementChild.remove();
  return c.innerHTML;
}
