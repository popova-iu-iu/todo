import { describe, expect, it } from 'vitest';
import { htmlToText, sanitize } from '../../src/sanitize';
import { BUILTIN } from '../../src/templates/builtin';

describe('sanitize', () => {
  it('убирает скрипты, обработчики, стили и ссылки', () => {
    const out = sanitize('<p onclick="x()" style="color:red">Привет<script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">ссылка</a><iframe src="//evil"></iframe></p>');
    expect(out).not.toMatch(/script|onclick|onerror|style=|href|iframe|src=/);
    expect(out).toContain('Привет');
    expect(out).toContain('ссылка');
  });
  it('сохраняет нашу разметку', () => {
    const html = '<h1 data-ph="Название">Крит</h1><p>Повторить <a class="wl" data-note="abc_123">слова</a></p><div class="checklist" data-block="Список дел"><div class="check"><input type="checkbox" checked=""><span class="e" data-ph="Пункт">Крем</span></div></div><img data-media="m1" alt="">';
    const out = sanitize(html);
    expect(out).toContain('data-note="abc_123"');
    expect(out).toContain('data-block="Список дел"');
    expect(out).toContain('checked');
    expect(out).toContain('data-media="m1"');
    expect(out).toContain('data-ph="Название"');
  });
  it('не пропускает странные id и чужие input', () => {
    const out = sanitize('<a data-note="x&quot; onmouseover=&quot;1">a</a><input type="text" value="1"><button type="submit">b</button>');
    expect(out).not.toContain('data-note');
    expect(out).not.toContain('type="text"');
    expect(out).toContain('type="button"');
  });
  it('встроенные шаблоны переживают очистку без потерь структуры', () => {
    for (const t of BUILTIN) {
      const s = sanitize(t.html);
      const blocks = (t.html.match(/data-block=/g) || []).length;
      expect((s.match(/data-block=/g) || []).length, t.name).toBe(blocks);
      expect(s).not.toContain('style=');
    }
  });
  it('текст для поиска', () => {
    expect(htmlToText('<h1>Крит</h1><p>море <b>и</b> горы</p>')).toBe('Крит море и горы');
  });
});
