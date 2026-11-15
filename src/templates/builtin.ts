import type { Template } from '../store/types';
import { callout, cards, checklist, h2, moods, ph, photo, quote } from './parts';

const svg = (inner: string) =>
  `<svg aria-hidden="true" viewBox="0 0 390 190" preserveAspectRatio="xMidYMax slice">${inner}</svg>`;
const bar = (w = '', extra = '') => `<div class="bar" style="${w ? `width:${w};` : ''}${extra}"></div>`;

/** Подстановка {{today}} → «15 ноября» делается при создании заметки. */
export const TODAY = '{{today}}';

type Def = Omit<Template, 'updatedAt' | 'builtin' | 'order'>;

const DEFS: Def[] = [
  {
    id: 'travel', name: 'Путешествие', shelf: 'Путешествия', newLabel: 'Новое путешествие', bg: '#2E6B52',
    thumbBg: '#DCEBE3',
    cover: svg('<circle cx="300" cy="70" r="26" fill="#F3D9A4"/><path d="M0 130c50-22 100-22 150 0s100 22 150 0 60-18 90-8v68H0z" fill="#3F8566"/><path d="M0 156c52-14 104-14 156 0s104 14 156 0 56-12 78-6v34H0z" fill="#5A9C7E"/><path d="M60 110l26-40 26 40zM96 110l20-30 20 30z" fill="#245441"/>'),
    thumb: '<div style="height:44px;border-radius:8px;background:#5A9C7E"></div>' + bar('70%') + '<div style="display:flex;gap:6px"><div style="flex:1;height:30px;border-radius:6px;background:#fff"></div><div style="flex:1;height:30px;border-radius:6px;background:#fff"></div></div>',
    html: ph('h1', 'Куда едем?') + ph('p', 'Когда, на сколько дней, с кем…') +
      callout('!', 'peach', 'Не забыть: билеты, бронь, документы') +
      h2('Места') + cards([['lav', 'Место', 'Чем интересно'], ['sand', 'Место', 'Чем интересно']]) +
      h2('Что взять') + checklist(['Документы', 'Зарядка', 'Что-то ещё']) +
      h2('Фото') + photo('Здесь будут фото из поездки'),
  },
  {
    id: 'book', name: 'Книга', shelf: 'Книги', newLabel: 'Новая книга', bg: '#FBF1E7', thumbBg: '#FBF1E7',
    cover: svg('<rect x="150" y="30" width="90" height="130" rx="6" fill="#8A4B1E" opacity=".75"/><rect x="160" y="30" width="6" height="130" fill="#5C3414" opacity=".5"/><path d="M175 70h50M175 84h36" stroke="#FBF1E7" stroke-width="4" stroke-linecap="round"/>'),
    thumb: '<div style="display:flex;gap:8px"><div style="width:34px;height:48px;border-radius:4px;background:#8A4B1E;opacity:.6"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px">' + bar() + bar('70%') + '</div></div><div style="height:26px;border-radius:6px;background:#fff"></div>',
    html: ph('h1', 'Название книги') + ph('p', 'Автор · когда прочитала · оценка') +
      h2('Главная мысль') + callout('★', 'peach', 'О чём эта книга в двух предложениях') +
      h2('Цитаты') + quote('Цитата, которую хочется запомнить') +
      h2('Что применю') + checklist(['Идея для жизни', 'Идея для жизни']),
  },
  {
    id: 'recipe', name: 'Рецепт', shelf: 'Рецепты', newLabel: 'Новый рецепт', bg: '#F5E6D8', thumbBg: '#F5E6D8',
    cover: svg('<circle cx="195" cy="120" r="70" fill="#fff" opacity=".7"/><circle cx="195" cy="120" r="50" fill="#E9C7A6"/><path d="M110 40c10-12 20-12 30 0M180 30c10-12 20-12 30 0M250 40c10-12 20-12 30 0" stroke="#C99B74" stroke-width="3" fill="none" stroke-linecap="round"/>'),
    thumb: '<div style="height:40px;border-radius:8px;background:#E9C7A6"></div>' + bar('50%') + bar('80%') + bar('65%'),
    html: ph('h1', 'Название блюда') +
      cards([['peach', 'Время', 'например, 40 минут'], ['sage', 'Порции', 'например, 4']]) +
      h2('Продукты') + checklist(['Продукт и количество', 'Продукт и количество', 'Продукт и количество']) +
      h2('Как готовить') + ph('p', '1. Первый шаг…') + ph('p', '2. Второй шаг…') +
      callout('!', 'peach', 'Секрет или совет') +
      photo('Фото готового блюда'),
  },
  {
    id: 'person', name: 'Человек', shelf: 'Люди', newLabel: 'Новый человек', bg: '#E4E6F5', thumbBg: '#E4E6F5',
    cover: svg('<circle cx="195" cy="88" r="40" fill="#B9BEE6"/><path d="M110 190c10-50 45-70 85-70s75 20 85 70z" fill="#B9BEE6"/>'),
    thumb: '<div style="display:flex;gap:10px;align-items:center"><div style="width:44px;height:44px;border-radius:22px;background:#B9BEE6"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px">' + bar('80%', 'height:10px;background:rgba(23,25,28,.25)') + bar('55%') + '</div></div><div style="height:26px;border-radius:6px;background:#fff"></div>' + bar('70%'),
    html: ph('h1', 'Имя') + ph('p', 'Кто это: где познакомились, чем занимается') +
      cards([['lav', 'Телефон', 'номер'], ['sage', 'День рождения', 'дата']]) +
      h2('Важно помнить') + callout('♥', 'lav', 'Что любит, о чём мечтает, имена детей…') +
      h2('О чём говорили') + ph('p', 'Дата — тема разговора…') +
      h2('Хочу сделать') + checklist(['Позвонить', 'Подарок на день рождения']),
  },
  {
    id: 'film', name: 'Фильм', shelf: 'Фильмы', newLabel: 'Новый фильм', bg: '#17191C', thumbBg: '#17191C', dark: true,
    cover: svg('<g fill="#2A2D31">' + Array.from({ length: 13 }, (_, i) => `<rect x="${i * 30 + 6}" y="10" width="18" height="12" rx="2"/><rect x="${i * 30 + 6}" y="168" width="18" height="12" rx="2"/>`).join('') + '</g><path d="M170 60l60 35-60 35z" fill="#F3D9A4"/>'),
    thumb: '<div style="display:flex;gap:4px">' + '<div style="flex:1;height:10px;border-radius:2px;background:#3A3E44"></div>'.repeat(6) + '</div><div style="height:40px;border-radius:6px;background:#2A2D31"></div><div style="display:flex;gap:4px">' + '<div style="width:12px;height:12px;border-radius:6px;background:#F3D9A4"></div>'.repeat(4) + '<div style="width:12px;height:12px;border-radius:6px;background:#3A3E44"></div></div>',
    html: ph('h1', 'Название фильма') + ph('p', 'Год · режиссёр · где смотрела') +
      cards([['gold', 'Оценка', 'из 10'], ['lav', 'С кем смотрела', 'одна, с кем-то']]) +
      h2('Впечатления') + callout('★', 'peach', 'Что зацепило больше всего') +
      ph('p', 'Мысли после просмотра…') +
      h2('Цитата') + quote('Фраза из фильма'),
  },
  {
    id: 'idea', name: 'Идея', shelf: 'Идеи', newLabel: 'Новая идея', bg: '#DCEBE3', thumbBg: '#DCEBE3',
    cover: svg('<circle cx="195" cy="85" r="44" fill="#F3D9A4"/><path d="M180 135h30v18h-30z" fill="#9CC7AF"/><g stroke="#F3D9A4" stroke-width="5" stroke-linecap="round"><path d="M195 20v-10M130 85h-12M272 85h-12M150 40l-8-8M240 40l8-8"/></g>'),
    thumb: '<div style="width:30px;height:30px;border-radius:15px;background:#F3D9A4;align-self:center"></div>' + bar('60%', 'height:10px;align-self:center;background:rgba(23,25,28,.25)') + '<div style="height:26px;border-radius:6px;background:#fff"></div><div style="display:flex;gap:6px;align-items:center"><div style="width:12px;height:12px;border-radius:3px;border:2px solid #2E6B52"></div>' + bar('', 'flex:1') + '</div>',
    html: ph('h1', 'Идея в двух словах') +
      callout('✦', 'sage', 'Суть: что именно придумала') +
      h2('Зачем') + ph('p', 'Какую проблему решает, кому пригодится…') +
      h2('Следующий шаг') + checklist(['Самое первое маленькое действие']) +
      h2('Связанные мысли') + ph('p', 'Что ещё с этим связано…'),
  },
  {
    id: 'project', name: 'Проект', shelf: 'Проекты', newLabel: 'Новый проект', bg: '#F4F5F7', thumbBg: '#F4F5F7',
    cover: svg('<g transform="translate(60 50)"><rect width="80" height="100" rx="10" fill="#fff"/><rect x="95" width="80" height="100" rx="10" fill="#fff"/><rect x="190" width="80" height="100" rx="10" fill="#fff"/><rect x="10" y="12" width="60" height="16" rx="4" fill="#DCEBE3"/><rect x="10" y="36" width="60" height="16" rx="4" fill="#DCEBE3"/><rect x="105" y="12" width="60" height="16" rx="4" fill="#FBF1E7"/><rect x="200" y="12" width="60" height="16" rx="4" fill="#E4E6F5"/></g>'),
    thumb: bar('55%', 'height:12px;background:rgba(23,25,28,.25)') + '<div style="display:flex;gap:6px;align-items:center"><div style="width:12px;height:12px;border-radius:3px;border:2px solid #2E6B52"></div>' + bar('', 'flex:1') + '</div><div style="display:flex;gap:6px;align-items:center"><div style="width:12px;height:12px;border-radius:3px;background:#2E6B52"></div>' + bar('', 'flex:1') + '</div>',
    html: ph('h1', 'Название проекта') +
      h2('Цель') + callout('◎', 'sage', 'Что должно получиться в итоге') +
      cards([['sage', 'Начало', 'дата'], ['peach', 'Готово к', 'дата']]) +
      h2('Задачи') + checklist(['Первый шаг', 'Второй шаг', 'Третий шаг']) +
      h2('Заметки') + ph('p', 'Идеи, ссылки, мысли по ходу…'),
  },
  {
    id: 'lecture', name: 'Конспект', shelf: 'Конспекты', newLabel: 'Новый конспект', bg: '#E4E6F5', thumbBg: '#E4E6F5',
    cover: svg('<g fill="none" stroke="#B9BEE6" stroke-width="2">' + Array.from({ length: 8 }, (_, i) => `<path d="M30 ${30 + i * 20}h330"/>`).join('') + '</g><path d="M70 0v190" stroke="#E6A3A3" stroke-width="2"/><rect x="250" y="40" width="90" height="110" rx="10" fill="#3E4594" opacity=".18"/>'),
    thumb: bar('60%', 'height:12px;background:#3E4594;opacity:.5') + '<div style="height:30px;border-radius:6px;background:#fff"></div>' + bar() + bar('75%'),
    html: ph('h1', 'Тема') + ph('p', 'Откуда: книга, курс, лекция, видео') +
      h2('Главное') + callout('★', 'lav', 'Одна-две мысли, которые важно запомнить') +
      h2('Подробно') + ph('p', 'Записи по ходу…') +
      h2('Вопросы') + checklist(['Что осталось непонятным?', 'Что проверить?']),
  },
  {
    id: 'diary', name: 'Дневник', shelf: 'Дневник', newLabel: 'Новая запись', bg: '#FBF1E7', thumbBg: '#FBF1E7',
    cover: svg('<rect x="135" y="40" width="120" height="120" rx="18" fill="#fff"/><rect x="135" y="40" width="120" height="34" rx="18" fill="#E9C7A6"/><rect x="135" y="58" width="120" height="16" fill="#E9C7A6"/><path d="M165 30v22M225 30v22" stroke="#8A4B1E" stroke-width="6" stroke-linecap="round"/><circle cx="170" cy="105" r="7" fill="#E9C7A6"/><circle cx="195" cy="105" r="7" fill="#E9C7A6"/><circle cx="220" cy="105" r="7" fill="#8A4B1E" opacity=".6"/><circle cx="170" cy="132" r="7" fill="#E9C7A6"/>'),
    thumb: '<div style="display:flex;gap:6px;align-items:center"><div style="width:28px;height:28px;border-radius:8px;background:#fff;font:800 13px Manrope,sans-serif;display:flex;align-items:center;justify-content:center;color:#8A4B1E">15</div>' + bar('', 'flex:1') + '</div><div style="display:flex;gap:6px">' + '<div style="width:20px;height:20px;border-radius:10px;background:#fff"></div>'.repeat(5) + '</div>' + bar() + bar('70%'),
    html: `<h1>${TODAY}</h1>` + ph('p', 'Как прошёл день?') +
      h2('Настроение') + moods() +
      h2('За что благодарна') + checklist(['Первое', 'Второе', 'Третье']) +
      h2('Мысли') + ph('p', 'Всё, что хочется записать…'),
  },
  {
    id: 'blank', name: 'Чистый лист', shelf: 'Разное', newLabel: 'Новый лист', bg: '#F4F5F7', thumbBg: '#FFFFFF',
    cover: '',
    thumb: bar('70%', 'height:12px;background:rgba(23,25,28,.25)') + bar() + bar('85%') + bar('60%'),
    html: ph('h1', 'Название') + ph('p', 'Просто начните писать…'),
  },
];

export const BUILTIN: Template[] = DEFS.map((d, i) => ({ ...d, builtin: true, order: i, updatedAt: 0 }));
export const BLANK_ID = 'blank';

/** Цвета обложек для своих шаблонов: [фон, акцент] */
export const PALETTE: [string, string][] = [
  ['#DCEBE3', '#2E6B52'], ['#E4E6F5', '#3E4594'], ['#F5E6D8', '#8A4B1E'], ['#F6E1E4', '#9B3446'], ['#ECEEF1', '#3A3E44'],
];

export const customThumb = () =>
  bar('60%', 'height:12px;background:rgba(23,25,28,.25)') + '<div style="height:30px;border-radius:6px;background:#fff"></div>' + bar() + bar('70%');

export function todayTitle(d = new Date()) {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
