/** Всё, что синхронизируется, имеет id, время изменения и признак удаления (tombstone). */
export interface Base {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export interface Note extends Base {
  templateId: string;
  title: string;
  /** очищенный HTML тела заметки (включая <h1>) */
  html: string;
  /** простой текст — для поиска */
  text: string;
  createdAt: number;
  /** id заметок, на которые ссылается эта */
  links: string[];
}

export interface Template extends Base {
  name: string;
  /** название полки во множественном числе */
  shelf: string;
  /** подпись большой кнопки: «Новая книга» */
  newLabel: string;
  /** цвет обложки */
  bg: string;
  /** SVG-иллюстрация обложки (может быть пустой) */
  cover: string;
  /** HTML миниатюры для плитки */
  thumb: string;
  /** фон миниатюры */
  thumbBg: string;
  /** HTML новой страницы с подсказками */
  html: string;
  builtin: boolean;
  order: number;
  /** тёмная обложка — светлая кнопка «Назад» и т.п. */
  dark?: boolean;
}

export interface TrashItem extends Base {
  kind: 'block' | 'note';
  noteId: string;
  noteTitle: string;
  /** что удалено: «Выноска», «Список дел», «Заметка» */
  label: string;
  /** HTML блока (для kind=block) */
  html: string;
  /** позиция блока среди детей документа */
  index: number;
  deletedAt: number;
}

export interface Media extends Base {
  blob: Blob;
  type: string;
}

export type CollectionName = 'notes' | 'templates' | 'media' | 'trash';
