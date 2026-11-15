/**
 * Шифрование на устройстве (только WebCrypto).
 *
 * Схема:
 *  - случайный 256-битный мастер-секрет;
 *  - он «завёрнут» (AES-256-GCM) ключом из пароля (PBKDF2-SHA256, 600 000 итераций)
 *    и, отдельно, ключом восстановления (128 случайных бит → HKDF);
 *  - из мастер-секрета через HKDF получаются ключ шифрования (AES-256-GCM)
 *    и ключ имён файлов (HMAC-SHA256).
 * Пароль никуда не отправляется и нигде не хранится.
 */

export const PBKDF2_ITER = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;
const rnd = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export interface Wrapped { iv: string; ct: string }
export interface KeyFile {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  pw: Wrapped;
  rk: Wrapped & { salt: string };
}
export interface Keys {
  enc: CryptoKey;
  name: CryptoKey;
}
export class WrongSecret extends Error {
  constructor() { super('Неверный пароль или ключ восстановления'); }
}

// ---------- base64 / hex ----------
export function b64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const hex = (u: Uint8Array) => [...u].map((x) => x.toString(16).padStart(2, '0')).join('');
const buf = (u: Uint8Array) => u as unknown as BufferSource;

// ---------- ключ восстановления: 26 символов base32 без похожих букв ----------
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 символа, без I, O, 0, 1
export function encodeRecovery(bytes: Uint8Array): string {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPH[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPH[(val << (5 - bits)) & 31];
  return out.match(/.{1,4}/g)!.join('-');
}
export function decodeRecovery(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let bits = 0, val = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const v = ALPH.indexOf(ch);
    if (v < 0) throw new WrongSecret();
    val = (val << 5) | v; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  if (out.length !== 16) throw new WrongSecret();
  return new Uint8Array(out);
}

// ---------- производные ключи ----------
async function passwordKek(password: string, salt: Uint8Array, iter: number) {
  const base = await subtle().importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function recoveryKek(rk: Uint8Array, salt: Uint8Array) {
  const base = await subtle().importKey('raw', buf(rk), 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: enc.encode('bz-recovery') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function wrap(kek: CryptoKey, secret: Uint8Array): Promise<Wrapped> {
  const iv = rnd(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, kek, buf(secret)));
  return { iv: b64(iv), ct: b64(ct) };
}
async function unwrap(kek: CryptoKey, w: Wrapped): Promise<Uint8Array> {
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: buf(unb64(w.iv)) }, kek, buf(unb64(w.ct))));
  } catch {
    throw new WrongSecret();
  }
}
async function keysFromSecret(secret: Uint8Array): Promise<Keys> {
  const base = await subtle().importKey('raw', buf(secret), 'HKDF', false, ['deriveKey']);
  const salt = enc.encode('bz-v1');
  const encKey = await subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('bz-data') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const nameKey = await subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('bz-names') }, base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
  return { enc: encKey, name: nameKey };
}

/** Первая настройка: новый мастер-секрет, ключ восстановления и файл ключей для репозитория. */
export async function createKeys(password: string, iter = PBKDF2_ITER) {
  const secret = rnd(32);
  const salt = rnd(16);
  const rk = rnd(16);
  const rkSalt = rnd(16);
  const keyFile: KeyFile = {
    v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt),
    pw: await wrap(await passwordKek(password, salt, iter), secret),
    rk: { ...(await wrap(await recoveryKek(rk, rkSalt), secret)), salt: b64(rkSalt) },
  };
  const keys = await keysFromSecret(secret);
  secret.fill(0);
  return { keyFile, keys, recoveryKey: encodeRecovery(rk) };
}

export async function unlockWithPassword(kf: KeyFile, password: string): Promise<Keys> {
  const secret = await unwrap(await passwordKek(password, unb64(kf.salt), kf.iter), kf.pw);
  return keysFromSecret(secret);
}

export async function unlockWithRecovery(kf: KeyFile, recovery: string): Promise<Keys> {
  const rk = decodeRecovery(recovery);
  const secret = await unwrap(await recoveryKek(rk, unb64(kf.rk.salt)), kf.rk);
  return keysFromSecret(secret);
}

/** Сменить пароль, зная ключ восстановления (или старый пароль). Ключ восстановления остаётся прежним. */
export async function rewrapPassword(kf: KeyFile, unlock: { password?: string; recovery?: string }, newPassword: string): Promise<KeyFile> {
  const secret = unlock.password != null
    ? await unwrap(await passwordKek(unlock.password, unb64(kf.salt), kf.iter), kf.pw)
    : await unwrap(await recoveryKek(decodeRecovery(unlock.recovery!), unb64(kf.rk.salt)), kf.rk);
  const salt = rnd(16);
  const out: KeyFile = { ...kf, salt: b64(salt), iter: kf.iter, pw: await wrap(await passwordKek(newPassword, salt, kf.iter), secret) };
  secret.fill(0);
  return out;
}

// ---------- шифрование данных ----------
const MAGIC = [0x42, 0x5a, 0x01]; // «BZ», версия 1

export async function encryptBytes(keys: Keys, data: Uint8Array): Promise<Uint8Array> {
  const iv = rnd(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, keys.enc, buf(data)));
  const out = new Uint8Array(3 + 12 + ct.length);
  out.set(MAGIC, 0); out.set(iv, 3); out.set(ct, 15);
  return out;
}

export async function decryptBytes(keys: Keys, data: Uint8Array): Promise<Uint8Array> {
  if (data.length < 15 + 16 || data[0] !== MAGIC[0] || data[1] !== MAGIC[1] || data[2] !== MAGIC[2]) throw new Error('Неизвестный формат файла');
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: buf(data.subarray(3, 15)) }, keys.enc, buf(data.subarray(15))));
  } catch {
    throw new WrongSecret();
  }
}

export const encryptJson = (keys: Keys, v: unknown) => encryptBytes(keys, enc.encode(JSON.stringify(v)));
export const decryptJson = async <T>(keys: Keys, data: Uint8Array): Promise<T> => JSON.parse(dec.decode(await decryptBytes(keys, data)));

/** Имя файла в репозитории: по нему нельзя узнать ни id, ни название заметки. */
export async function fileName(keys: Keys, kind: string, id: string): Promise<string> {
  const mac = new Uint8Array(await subtle().sign('HMAC', keys.name, enc.encode(`${kind}:${id}`)));
  return `${kind}/${hex(mac.subarray(0, 20))}.bin`;
}
