import { callout, cards, checkItem, divider, gallery, photo, quote } from '../templates/parts';

/** 8 блоков кнопки «+»: название, цвет плитки, цвет значка, HTML. */
export const BLOCKS: { name: string; bg: string; mark: string; html: () => string }[] = [
  { name: 'Фото', bg: '#DCEBE3', mark: '#9CC7AF', html: () => photo('Нажмите, чтобы добавить фото') },
  { name: 'Заголовок', bg: '#E4E6F5', mark: '#B9BEE6', html: () => '<h2 data-ph="Заголовок"></h2>' },
  { name: 'Список дел', bg: '#F4F5F7', mark: '#C9CDD3', html: () => `<div class="checklist" data-block="Список дел">${checkItem('Новый пункт')}</div>` },
  { name: 'Выноска', bg: '#FBF1E7', mark: '#E9C7A6', html: () => callout('!', 'peach', 'Важная мысль…') },
  { name: 'Карточки', bg: '#E4E6F5', mark: '#B9BEE6', html: () => cards([['lav', 'Карточка', 'Короткое описание'], ['sand', 'Карточка', 'Короткое описание']]) },
  { name: 'Галерея', bg: '#DCEBE3', mark: '#9CC7AF', html: gallery },
  { name: 'Цитата', bg: '#FBF1E7', mark: '#E9C7A6', html: () => quote('Цитата, которую хочется запомнить') },
  { name: 'Разделитель', bg: '#F4F5F7', mark: '#C9CDD3', html: divider },
];

export function blockLabel(el: Element): string {
  const b = (el as HTMLElement).dataset?.block;
  if (b) return b;
  if (el.tagName === 'H2') return 'Заголовок';
  return 'Текст';
}
