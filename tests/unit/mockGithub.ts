/** Имитация GitHub REST API (репозиторий в памяти с историей коммитов) — для тестов бэкапа. */
export function mockGithub(opts: { private?: boolean; repo?: string } = {}) {
  const REPO = opts.repo || 'me/backup';
  let n = 0;
  const sha = () => (++n).toString(16).padStart(40, '0');
  const blobs = new Map<string, Uint8Array>();
  const trees = new Map<string, Map<string, string>>(); // tree sha → path → blob sha
  const commits = new Map<string, { tree: string; parents: string[]; message: string; date: string }>();
  let head: string | null = null; // main
  const calls: string[] = [];
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
  const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  const filesAt = (ref: string | null): Map<string, Uint8Array> => {
    const c = ref === 'main' || !ref ? head : ref;
    const out = new Map<string, Uint8Array>();
    if (!c || !commits.has(c)) return out;
    for (const [p, b] of trees.get(commits.get(c)!.tree)!) out.set(p, blobs.get(b)!);
    return out;
  };
  const touched = (c: string, path: string) => {
    const cur = commits.get(c)!;
    const a = trees.get(cur.tree)!.get(path);
    const b = cur.parents[0] ? trees.get(commits.get(cur.parents[0])!.tree)!.get(path) : undefined;
    return a !== b;
  };

  const fetchFn = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    calls.push(`${method} ${url.pathname}`);
    const h = (init.headers || {}) as Record<string, string>;
    if (h.Authorization !== 'Bearer good-token') return json({ message: 'Bad credentials' }, 401);
    const m = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)(\/.*)?$/);
    if (!m || decodeURIComponent(m[1]) !== REPO) return json({ message: 'Not Found' }, 404);
    const rest = m[2] || '';
    const body = init.body ? JSON.parse(String(init.body)) : null;

    if (!rest) return json({ full_name: REPO, private: opts.private ?? true, default_branch: 'main', permissions: { push: true } });

    const cm = rest.match(/^\/contents\/(.+)$/);
    if (cm && method === 'GET') {
      if (!head) return json({ message: 'This repository is empty.' }, 404);
      const f = filesAt(url.searchParams.get('ref')).get(decodeURIComponent(cm[1]));
      return f ? new Response(f.slice().buffer) : json({ message: 'Not Found' }, 404);
    }
    if (cm && method === 'PUT') {
      const path = decodeURIComponent(cm[1]);
      const b = sha(); blobs.set(b, unb64(body.content));
      const base = head ? new Map(trees.get(commits.get(head)!.tree)!) : new Map<string, string>();
      base.set(path, b);
      const t = sha(); trees.set(t, base);
      const c = sha(); commits.set(c, { tree: t, parents: head ? [head] : [], message: body.message, date: new Date(Date.now() + n * 1000).toISOString() });
      head = c;
      return json({ commit: { sha: c } }, 201);
    }
    if (rest === '/git/ref/heads/main') return head ? json({ object: { sha: head } }) : json({ message: 'Git Repository is empty.' }, 409);
    const gc = rest.match(/^\/git\/commits\/(\w+)$/);
    if (gc) { const c = commits.get(gc[1]); return c ? json({ sha: gc[1], tree: { sha: c.tree } }) : json({ message: 'Not Found' }, 404); }
    if (rest === '/git/blobs' && method === 'POST') { const b = sha(); blobs.set(b, unb64(body.content)); return json({ sha: b }, 201); }
    if (rest === '/git/trees' && method === 'POST') {
      const t = new Map(trees.get(body.base_tree)!);
      for (const e of body.tree) {
        if (e.sha === null) { if (!t.has(e.path)) return json({ message: 'GitRPC::BadObjectState' }, 422); t.delete(e.path); }
        else t.set(e.path, e.sha);
      }
      const s = sha(); trees.set(s, t); return json({ sha: s }, 201);
    }
    if (rest === '/git/commits' && method === 'POST') {
      const s = sha(); const date = new Date(Date.now() + n * 1000).toISOString();
      commits.set(s, { tree: body.tree, parents: body.parents, message: body.message, date });
      return json({ sha: s, committer: { date } }, 201);
    }
    if (rest === '/git/refs/heads/main' && method === 'PATCH') {
      if (commits.get(body.sha)!.parents[0] !== head) return json({ message: 'Update is not a fast forward' }, 422);
      head = body.sha; return json({ object: { sha: head } });
    }
    if (rest === '/commits') {
      const path = url.searchParams.get('path');
      const out = [];
      for (let c = head; c; c = commits.get(c)!.parents[0] || null) {
        if (!path || touched(c, path)) out.push({ sha: c, commit: { message: commits.get(c)!.message, committer: { date: commits.get(c)!.date } } });
      }
      return json(out);
    }
    return json({ message: 'not mocked ' + rest }, 404);
  };
  /** Подменить голову ветки — имитация параллельного коммита с другого устройства. */
  const bumpHead = () => { if (head) { const c = sha(); commits.set(c, { ...commits.get(head)!, parents: [head], message: 'другое устройство' }); head = c; } };
  return { fetchFn: fetchFn as typeof fetch, files: () => filesAt('main'), commitCount: () => { let k = 0; for (let c = head; c; c = commits.get(c)!.parents[0] || null) k++; return k; }, calls, bumpHead };
}
