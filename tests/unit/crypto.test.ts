import { describe, expect, it } from 'vitest';
import {
  createKeys, decodeRecovery, decryptJson, encodeRecovery, encryptJson, fileName,
  rewrapPassword, unlockWithPassword, unlockWithRecovery, WrongSecret,
} from '../../src/crypto/keys';

const ITER = 2000; // в приложении 600 000; в тестах быстрее

describe('шифрование', () => {
  it('шифрует и расшифровывает, ключ из пароля и из ключа восстановления совпадают', async () => {
    const { keyFile, keys, recoveryKey } = await createKeys('секретный пароль', ITER);
    expect(JSON.stringify(keyFile)).not.toContain('секрет');
    const data = await encryptJson(keys, { t: 'Крит', n: 1 });
    expect(new TextDecoder().decode(data)).not.toContain('Крит');

    const k2 = await unlockWithPassword(keyFile, 'секретный пароль');
    expect(await decryptJson(k2, data)).toEqual({ t: 'Крит', n: 1 });
    const k3 = await unlockWithRecovery(keyFile, recoveryKey.toLowerCase().replace(/-/g, ' '));
    expect(await decryptJson(k3, data)).toEqual({ t: 'Крит', n: 1 });
  });

  it('неверный пароль и ключ — понятная ошибка', async () => {
    const { keyFile } = await createKeys('pass-1234', ITER);
    await expect(unlockWithPassword(keyFile, 'не тот')).rejects.toBeInstanceOf(WrongSecret);
    await expect(unlockWithRecovery(keyFile, 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AA')).rejects.toBeInstanceOf(WrongSecret);
    await expect(unlockWithRecovery(keyFile, 'короткий')).rejects.toBeInstanceOf(WrongSecret);
  });

  it('подмена шифртекста обнаруживается', async () => {
    const { keys } = await createKeys('pass-1234', ITER);
    const data = await encryptJson(keys, { a: 1 });
    data[data.length - 1] ^= 1;
    await expect(decryptJson(keys, data)).rejects.toThrow();
  });

  it('имена файлов стабильны и не раскрывают id', async () => {
    const { keyFile, keys } = await createKeys('pass-1234', ITER);
    const a = await fileName(keys, 'n', 'note-42');
    expect(a).toMatch(/^n\/[0-9a-f]{40}\.bin$/);
    expect(a).not.toContain('note-42');
    expect(await fileName(await unlockWithPassword(keyFile, 'pass-1234'), 'n', 'note-42')).toBe(a);
    expect(await fileName(keys, 'n', 'note-43')).not.toBe(a);
  });

  it('смена пароля через ключ восстановления', async () => {
    const { keyFile, keys, recoveryKey } = await createKeys('old-pass', ITER);
    const data = await encryptJson(keys, 'x');
    const kf2 = await rewrapPassword(keyFile, { recovery: recoveryKey }, 'new-pass');
    expect(await decryptJson(await unlockWithPassword(kf2, 'new-pass'), data)).toBe('x');
    await expect(unlockWithPassword(kf2, 'old-pass')).rejects.toBeInstanceOf(WrongSecret);
  });

  it('ключ восстановления кодируется туда и обратно', () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    const s = encodeRecovery(b);
    expect(s).toMatch(/^([A-Z2-9]{4}-){6}[A-Z2-9]{2}$/);
    expect([...decodeRecovery(s)]).toEqual([...b]);
  });
});
