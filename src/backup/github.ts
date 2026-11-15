import { b64 } from '../crypto/keys';

/** Подключение к приватному репозиторию GitHub для зашифрованных копий. */
export interface GitHubConfig {
  /** «владелец/репозиторий» */
  repo: string;
  /** Fine-grained token с правом Contents: Read and write на этот репозиторий. Хранится только на устройстве. */
  token: string;
}

export type CommitAction =
  | { action: 'create' | 'update'; file_path: string; content: Uint8Array }
  | { action: 'delete'; file_path: string };

export interface CommitInfo { id: string; created_at: string; message: string }

export class RemoteError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const API = 'https://api.github.com';

/** «https://github.com/имя/репо.git» → «имя/репо» */
export function normalizeRepo(s: string) {
  return s.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
}

export class GitHub {
  private branch: string | null = null;
  constructor(private cfg: GitHubConfig, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}

  private url(path: string) {
    return `${API}/repos/${normalizeRepo(this.cfg.repo).split('/').map(encodeURIComponent).join('/')}${path}`;
  }

  private async req(path: string, init: RequestInit & { accept?: string; okStatuses?: number[] } = {}): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchFn(this.url(path), {
        method: init.method,
        body: init.body,
        headers: {
          Authorization: `Bearer ${this.cfg.token.trim()}`,
          Accept: init.accept || 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new RemoteError(0, 'Нет связи с GitHub. Проверьте интернет.');
    }
    if (res.ok || (init.okStatuses || []).includes(res.status)) return res;
    let msg = '';
    try { msg = (await res.json()).message || ''; } catch { /* пусто */ }
    if (res.status === 401) throw new RemoteError(401, 'GitHub не принял токен. Проверьте, что он не истёк.');
    if (res.status === 403) throw new RemoteError(403, 'У токена нет права записи в этот репозиторий (нужно Contents: Read and write).');
    if (res.status === 404) throw new RemoteError(404, 'Репозиторий не найден. Проверьте имя и что токену дан доступ к этому репозиторию.');
    throw new RemoteError(res.status, msg || `GitHub ответил ошибкой ${res.status}`);
  }

  /** Проверить доступ. */
  async project(): Promise<{ private: boolean; default_branch: string; full_name: string; canWrite: boolean }> {
    const p = await (await this.req('')).json();
    this.branch = p.default_branch || 'main';
    return { private: !!p.private, default_branch: this.branch!, full_name: p.full_name, canWrite: p.permissions ? !!p.permissions.push : true };
  }

  async getBranch() {
    if (!this.branch) await this.project();
    return this.branch!;
  }

  private filePath(path: string) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  /** Прочитать файл. null — файла нет (или репозиторий ещё пустой). */
  async read(path: string, ref?: string): Promise<Uint8Array | null> {
    const r = await this.req(`/contents/${this.filePath(path)}?ref=${encodeURIComponent(ref || (await this.getBranch()))}`, {
      accept: 'application/vnd.github.raw+json',
      okStatuses: [404, 409],
    });
    if (r.status === 404 || r.status === 409) return null;
    return new Uint8Array(await r.arrayBuffer());
  }

  /** Голова ветки; null — репозиторий пустой. */
  private async head(branch: string): Promise<string | null> {
    const r = await this.req(`/git/ref/heads/${encodeURIComponent(branch)}`, { okStatuses: [404, 409] });
    if (r.status === 404 || r.status === 409) return null;
    return (await r.json()).object.sha;
  }

  /** Одно изменение — один коммит, атомарно (Git Data API). */
  async commit(message: string, actions: CommitAction[]): Promise<CommitInfo> {
    const branch = await this.getBranch();
    let base = await this.head(branch);
    if (!base) {
      // в пустом репозитории Git Data API не работает — создаём первый коммит через Contents API
      await this.req(`/contents/README.md`, {
        method: 'PUT',
        body: JSON.stringify({ message: 'Хранилище копий', content: b64(new TextEncoder().encode('# Зашифрованная копия заметок\n')), branch }),
      });
      base = await this.head(branch);
      if (!base) throw new RemoteError(409, 'Не удалось подготовить пустой репозиторий');
    }
    const baseCommit = await (await this.req(`/git/commits/${base}`)).json();
    const tree = [];
    for (const a of actions) {
      if (a.action === 'delete') {
        tree.push({ path: a.file_path, mode: '100644', type: 'blob', sha: null });
      } else {
        const blob = await (await this.req('/git/blobs', { method: 'POST', body: JSON.stringify({ content: b64(a.content), encoding: 'base64' }) })).json();
        tree.push({ path: a.file_path, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }
    const newTree = await (await this.req('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }) })).json();
    const c = await (await this.req('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [base] }) })).json();
    const upd = await this.req(`/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }), okStatuses: [409, 422],
    });
    // ветку успели изменить с другого устройства — движок повторит синхронизацию
    if (!upd.ok) throw new RemoteError(409, 'Репозиторий изменился во время копирования');
    return { id: c.sha, created_at: c.committer?.date || new Date().toISOString(), message };
  }

  /** История версий файла (новые сверху). */
  async history(path: string, limit = 50): Promise<CommitInfo[]> {
    const branch = await this.getBranch();
    const r = await this.req(`/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`, { okStatuses: [404, 409] });
    if (!r.ok) return [];
    const list = await r.json();
    return list.map((c: any) => ({ id: c.sha, created_at: c.commit.committer.date, message: c.commit.message }));
  }
}
