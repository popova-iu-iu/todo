import { b64 } from '../crypto/keys';

/** Подключение к приватному репозиторию GitLab для зашифрованных копий. */
export interface GitLabConfig {
  /** https://gitlab.com или адрес своего сервера */
  url: string;
  /** путь проекта «имя/репозиторий» или числовой id */
  project: string;
  /** Project/Personal Access Token с правом api. Хранится только на устройстве. */
  token: string;
}

export type CommitAction =
  | { action: 'create' | 'update'; file_path: string; content: Uint8Array }
  | { action: 'delete'; file_path: string };

export interface CommitInfo { id: string; created_at: string; message: string }

export class GitLabError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class GitLab {
  private branch: string | null = null;
  constructor(private cfg: GitLabConfig, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}

  private base() {
    const url = this.cfg.url.replace(/\/+$/, '');
    return `${url}/api/v4/projects/${encodeURIComponent(this.cfg.project.trim().replace(/^\/+|\/+$/g, ''))}`;
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchFn(this.base() + path, {
        ...init,
        headers: { Authorization: `Bearer ${this.cfg.token.trim()}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
      });
    } catch {
      throw new GitLabError(0, 'Нет связи с GitLab. Проверьте интернет.');
    }
    if (res.ok || res.status === 404) return res;
    let msg = '';
    try { const j = await res.json(); msg = typeof j.message === 'string' ? j.message : JSON.stringify(j.message || j.error || ''); } catch { /* пусто */ }
    if (res.status === 401) throw new GitLabError(401, 'GitLab не принял токен. Проверьте, что он не истёк и у него есть право api.');
    if (res.status === 403) throw new GitLabError(403, 'У токена нет прав на запись в этот репозиторий.');
    throw new GitLabError(res.status, msg || `GitLab ответил ошибкой ${res.status}`);
  }

  /** Проверить доступ. Возвращает данные проекта. */
  async project(): Promise<{ id: number; default_branch: string | null; visibility?: string; path_with_namespace?: string }> {
    const r = await this.req('');
    if (r.status === 404) throw new GitLabError(404, 'Репозиторий не найден. Проверьте адрес проекта и права токена.');
    const p = await r.json();
    this.branch = p.default_branch || 'main';
    return p;
  }

  async getBranch() {
    if (!this.branch) await this.project();
    return this.branch!;
  }

  /** Прочитать файл. null — файла нет. */
  async read(path: string, ref?: string): Promise<Uint8Array | null> {
    const r = await this.req(`/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref || (await this.getBranch()))}`);
    if (r.status === 404) return null;
    return new Uint8Array(await r.arrayBuffer());
  }

  /** Одно изменение — один коммит, атомарно. */
  async commit(message: string, actions: CommitAction[]) {
    const branch = await this.getBranch();
    const body = {
      branch, commit_message: message,
      actions: actions.map((a) => a.action === 'delete'
        ? { action: 'delete', file_path: a.file_path }
        : { action: a.action, file_path: a.file_path, encoding: 'base64', content: b64(a.content) }),
    };
    const r = await this.req('/repository/commits', { method: 'POST', body: JSON.stringify(body) });
    if (r.status === 404) throw new GitLabError(404, 'Репозиторий не найден.');
    return (await r.json()) as CommitInfo;
  }

  /** История версий файла (новые сверху). */
  async history(path: string, limit = 50): Promise<CommitInfo[]> {
    const branch = await this.getBranch();
    const r = await this.req(`/repository/commits?ref_name=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`);
    if (r.status === 404) return [];
    return r.json();
  }
}
