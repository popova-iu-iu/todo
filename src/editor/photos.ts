import { ctx } from '../app';
import { uid } from '../ui/dom';

const MAX = 1600;

/** Выбрать фото (iPhone сам предложит камеру или галерею), уменьшить и сохранить. */
export function pickPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.append(input);
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return resolve(null);
      try {
        const blob = await shrink(f);
        const id = uid();
        await ctx.store.media.put({ id, blob, type: blob.type, updatedAt: Date.now() });
        resolve(id);
      } catch (e) {
        console.error(e);
        resolve(null);
      }
    });
    input.click();
  });
}

async function shrink(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < 1.5e6 && /jpe?g|png|webp/.test(file.type)) return file;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.85));
}

/** Подставить картинки из хранилища. Возвращает функцию освобождения памяти. */
export async function resolveImages(root: HTMLElement): Promise<() => void> {
  const urls: string[] = [];
  for (const img of root.querySelectorAll<HTMLImageElement>('img[data-media]')) {
    const m = await ctx.store.media.get(img.dataset.media!);
    if (m && !m.deleted) {
      const u = URL.createObjectURL(m.blob);
      urls.push(u);
      img.src = u;
    }
  }
  return () => urls.forEach((u) => URL.revokeObjectURL(u));
}

export async function setImage(img: HTMLImageElement, id: string) {
  img.dataset.media = id;
  const m = await ctx.store.media.get(id);
  if (m) img.src = URL.createObjectURL(m.blob);
}
