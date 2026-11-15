export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const notesCount = (n: number) => (n ? `${n} ${plural(n, 'заметка', 'заметки', 'заметок')}` : 'Пока пусто');

const MONTHS = ['янв', 'февр', 'марта', 'апр', 'мая', 'июня', 'июля', 'авг', 'сент', 'окт', 'нояб', 'дек'];
/** «Сегодня», «Вчера», «12 нояб», «3 марта 2024» */
export function shortDate(ts: number, now = Date.now()) {
  const d = new Date(ts), n = new Date(now);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === n.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
export function timeHM(ts: number) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
/** «сегодня, 14:20» / «вчера, 09:10» / «12 нояб, 14:20» */
export function whenFull(ts: number, now = Date.now()) {
  const s = shortDate(ts, now);
  return `${s === 'Сегодня' || s === 'Вчера' ? s.toLowerCase() : s}, ${timeHM(ts)}`;
}
