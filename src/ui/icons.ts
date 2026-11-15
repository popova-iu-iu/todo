const s = (w: number, sw: number, inner: string) =>
  `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const icons = {
  back: s(22, 2, '<path d="m15 5-7 7 7 7"/>'),
  chevron: s(18, 2, '<path d="m9 6 6 6-6 6"/>'),
  plus: (w = 22, sw = 2) => s(w, sw, '<path d="M12 5v14M5 12h14"/>'),
  search: s(20, 1.8, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  gear: s(22, 1.8, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  link: s(16, 2, '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  trash: s(22, 2, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  check: s(26, 2.2, '<path d="m5 12 5 5 9-10"/>'),
  sync: s(20, 1.8, '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>'),
  lock: s(20, 1.8, '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  box: s(20, 1.8, '<path d="M4 7h16v12H4z"/><path d="M4 7l2-3h12l2 3"/>'),
  devices: s(20, 1.8, '<rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M6 18h6"/><rect x="17" y="8" width="5" height="11" rx="1.2"/>'),
  graph: s(20, 1.8, '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="m8.3 8.2 2.6 7.6M15.8 7.5l-2.6 8.2M8.5 6.8l7-.6"/>'),
  restore: s(20, 1.8, '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>'),
  warn: s(26, 2, '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.5v.01"/>'),
  cloudOff: s(26, 2, '<path d="M3 3l18 18"/><path d="M8 8a5 5 0 0 0-1 9.9h10"/><path d="M14.5 6.4A6 6 0 0 1 20 12a4 4 0 0 1-1 3"/>'),
  key: s(20, 1.8, '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>'),
  copy: s(20, 1.8, '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  photo: s(26, 1.6, '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/>'),
};
