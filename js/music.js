// Widget musik floating + pencarian Deezer (API publik gratis)
import { $, h, toast } from './ui.js';
import { sfx } from './sfx.js';

const DEEZER = 'https://api.deezer.com';
let dragging = false, ox = 0, oy = 0, px = 0, py = 0;

function posFab(x, y) {
  const fab = $('musicFab');
  if (!fab) return;
  const maxX = window.innerWidth - fab.offsetWidth - 8;
  const maxY = window.innerHeight - fab.offsetHeight - 8;
  px = Math.max(8, Math.min(x, maxX));
  py = Math.max(8, Math.min(y, maxY));
  fab.style.left = px + 'px';
  fab.style.top = py + 'px';
  fab.style.right = 'auto';
  fab.style.bottom = 'auto';
}

function trackRow(t) {
  const art = t.artist?.name || 'Unknown';
  const title = t.title || 'Track';
  const cover = t.album?.cover_small || t.album?.cover || '';
  const row = h('button', 'music-row',
    cover ? (() => { const i = h('img', 'music-cover'); i.src = cover; i.alt = ''; i.loading = 'lazy'; return i; })() : h('div', 'music-cover empty'),
    h('div', 'grow', h('div', 'nm', title), h('div', 'sb', art + (t.duration ? ' · ' + Math.floor(t.duration / 60) + ':' + String(t.duration % 60).padStart(2, '0') : ''))),
    h('span', 'music-play-ico', '▶')
  );
  row.type = 'button';
  row.onclick = () => playTrack(t);
  return row;
}

function playTrack(t) {
  const player = $('musicPlayer');
  const audio = $('musicAudio');
  const now = $('musicNow');
  if (!player || !audio) return;
  if (!t.preview) {
    toast('Preview tidak tersedia untuk lagu ini.');
    return;
  }
  now.textContent = (t.title || '') + ' — ' + (t.artist?.name || '');
  audio.src = t.preview;
  player.hidden = false;
  audio.play().catch(() => toast('Tidak bisa memutar preview.'));
  sfx('ok');
}

async function search(q) {
  const list = $('musicList');
  if (!list) return;
  list.replaceChildren(h('div', 'empty', 'Mencari...'));
  try {
    // Deezer public API via jsonp-style proxy or direct (CORS may block — use corsproxy / allorigins as fallback)
    const url = `${DEEZER}/search?q=${encodeURIComponent(q)}&limit=20`;
    let data = null;
    try {
      const r = await fetch(url);
      if (r.ok) data = await r.json();
    } catch { /* CORS */ }
    if (!data) {
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const r2 = await fetch(proxy);
      data = await r2.json();
    }
    list.replaceChildren();
    const tracks = data?.data || [];
    if (!tracks.length) {
      list.append(h('div', 'empty', 'Tidak ada hasil.'));
      return;
    }
    tracks.forEach(t => list.append(trackRow(t)));
  } catch (e) {
    list.replaceChildren(h('div', 'empty', 'Gagal mencari. Coba lagi.'));
  }
}

export function initMusic() {
  const fab = $('musicFab');
  const popup = $('musicPopup');
  if (!fab || !popup) return;

  // Default position bottom-right
  px = window.innerWidth - 72;
  py = window.innerHeight - 160;
  posFab(px, py);

  let moved = false;
  fab.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    dragging = true;
    moved = false;
    ox = e.clientX - px;
    oy = e.clientY - py;
    fab.setPointerCapture?.(e.pointerId);
    fab.classList.add('dragging');
    e.preventDefault();
  });
  fab.addEventListener('pointermove', e => {
    if (!dragging) return;
    const nx = e.clientX - ox, ny = e.clientY - oy;
    if (Math.abs(nx - px) > 4 || Math.abs(ny - py) > 4) moved = true;
    posFab(nx, ny);
  });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove('dragging');
    try { fab.releasePointerCapture?.(e.pointerId); } catch {}
    if (!moved) {
      popup.hidden = !popup.hidden;
      if (!popup.hidden) {
        sfx('open');
        $('musicQ')?.focus();
      }
    }
  };
  fab.addEventListener('pointerup', endDrag);
  fab.addEventListener('pointercancel', endDrag);

  $('musicClose').onclick = () => { popup.hidden = true; };
  $('musicGo').onclick = () => {
    const q = ($('musicQ').value || '').trim();
    if (q) search(q);
  };
  $('musicQ').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = ($('musicQ').value || '').trim();
      if (q) search(q);
    }
  });

  window.addEventListener('resize', () => posFab(px, py));
}
