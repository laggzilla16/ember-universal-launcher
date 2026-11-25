const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const furl = p => 'file:///' + encodeURI(String(p).replace(/\\/g, '/')).replace(/#/g, '%23').replace(/'/g, '%27');
const hue = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ini = n => String(n || '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const art = g => g.cover ? `background-image:url('${furl(g.cover)}')`
  : `background:linear-gradient(150deg,hsl(${hue(g.name)} 55% 30%),hsl(${(hue(g.name) + 60) % 360} 60% 12%))`;

let games = [], sel = 0, seq = 0;

function paint() {
  const list = $('#list');
  if (!games.length) { list.innerHTML = `<div class="qk-empty">${$('#q').value ? 'No games match your search.' : 'No installed games yet. Add games in NUKRON.'}</div>`; return; }
  list.innerHTML = games.map((g, i) => `<div class="qk-row${i === sel ? ' on' : ''}" role="option" data-i="${i}" aria-selected="${i === sel}">
    <i class="qk-art" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</i>
    <div><b>${esc(g.name)}</b><span>${g.running ? 'Playing now' : esc(g.lastLabel || 'Never played')}${g.grp ? ' · ' + esc(g.grp) : ''}</span></div>
    ${g.running ? '<em class="qk-live">Playing</em>' : '<em class="qk-go">Launch</em>'}</div>`).join('');
  list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
}

async function refresh() {
  const my = ++seq, r = await window.quick.list($('#q').value);
  if (my !== seq || !r) return; // a newer keystroke already asked
  document.documentElement.dataset.theme = r.theme === 'light' ? 'light' : 'dark';
  games = Array.isArray(r.games) ? r.games : []; sel = 0; paint();
}

async function launchSel() {
  const g = games[sel]; if (!g) return;
  if (g.running) return window.quick.close();
  await window.quick.launch(g.id); // main hides the popup and reports any failure
}

$('#q').addEventListener('input', refresh);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); return window.quick.close(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!games.length) return;
    sel = (sel + (e.key === 'ArrowDown' ? 1 : games.length - 1)) % games.length; paint();
  } else if (e.key === 'Enter') { e.preventDefault(); launchSel(); }
});
$('#list').addEventListener('click', e => { const r = e.target.closest('.qk-row'); if (r) { sel = +r.dataset.i; launchSel(); } });
$('#list').addEventListener('mousemove', e => { const r = e.target.closest('.qk-row'); if (r && +r.dataset.i !== sel) { sel = +r.dataset.i; document.querySelectorAll('.qk-row').forEach((x, i) => { x.classList.toggle('on', i === sel); x.setAttribute('aria-selected', i === sel); }); } });

window.quick.onOpen(() => { $('#q').value = ''; $('#qk').classList.remove('in'); void $('#qk').offsetWidth; $('#qk').classList.add('in'); refresh(); $('#q').focus(); });
refresh();
