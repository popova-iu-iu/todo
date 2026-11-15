/** Имитация GitLab API (репозиторий в памяти с историей коммитов) — для тестов бэкапа. */
export function mockGitlab() {
  let files = new Map<string, Uint8Array>();
  const commits: { id: string; created_at: string; message: string; files: Map<string, Uint8Array>; paths: string[] }[] = [];
  let n = 0;
  const calls: string[] = [];
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
  const fileAt = (ref: string) => (ref === 'main' ? files : commits.find((c) => c.id === ref)?.files || new Map());

  const fetchFn = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    calls.push(`${method} ${url.pathname}`);
    const auth = (init.headers as Record<string, string>)?.Authorization;
    if (auth !== 'Bearer good-token') return json({ message: '401 Unauthorized' }, 401);
    const m = url.pathname.match(/^\/api\/v4\/projects\/([^/]+)(\/.*)?$/);
    if (!m || decodeURIComponent(m[1]) !== 'me/backup') return json({ message: '404 Project Not Found' }, 404);
    const rest = m[2] || '';
    if (!rest) return json({ id: 1, default_branch: commits.length ? 'main' : null, visibility: 'private', path_with_namespace: 'me/backup' });
    const fm = rest.match(/^\/repository\/files\/(.+)\/raw$/);
    if (fm) {
      const f = fileAt(url.searchParams.get('ref') || 'main').get(decodeURIComponent(fm[1]));
      return f ? new Response(f.slice().buffer) : json({ message: '404 File Not Found' }, 404);
    }
    if (rest === '/repository/commits' && method === 'POST') {
      const body = JSON.parse(String(init.body));
      const next = new Map(files);
      for (const a of body.actions) {
        const has = next.has(a.file_path);
        if (a.action === 'create' && has) return json({ message: 'A file with this name already exists' }, 400);
        if ((a.action === 'update' || a.action === 'delete') && !has) return json({ message: "A file with this name doesn't exist" }, 400);
        if (a.action === 'delete') next.delete(a.file_path);
        else next.set(a.file_path, Uint8Array.from(atob(a.content), (c) => c.charCodeAt(0)));
      }
      files = next;
      const c = { id: 'c' + ++n, created_at: new Date(Date.now() + n * 1000).toISOString(), message: body.commit_message, files: new Map(next), paths: body.actions.map((a: any) => a.file_path) };
      commits.push(c);
      return json({ id: c.id, created_at: c.created_at, message: c.message }, 201);
    }
    if (rest === '/repository/commits') {
      const path = url.searchParams.get('path');
      return json(commits.filter((c) => !path || c.paths.includes(path)).reverse().map(({ id, created_at, message }) => ({ id, created_at, message })));
    }
    return json({ message: 'not mocked' }, 404);
  };
  return { fetchFn: fetchFn as typeof fetch, files: () => files, commits, calls };
}
