import { LANDMARKS, MAX_MAP_BYTES, exampleMap, readDraft, saveDraft, normalizeMap, parseMap, validateMap, authoredLevel, publishMap, copyMap } from './custom-map.js';
import { network } from './engine.js';
import { compass } from './levels.js';
import { postcardArt } from './art.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let storage; try { storage = localStorage; } catch { storage = null; }
let map = readDraft(storage), selected = 1, history = [], preview = null;
$('#roads').innerHTML = Array.from({ length: 16 }, (_, mask) => {
  const ports = compass.map((_, i) => mask & (1 << i) ? i : -1).filter(i => i >= 0);
  return `<option value="${ports.join(',')}">${ports.length ? ports.map(i => compass[i][0].toUpperCase() + compass[i].slice(1)).join(' + ') : 'No roads'}</option>`;
}).join('');

function notice(message) { $('#maker-notice').textContent = message; }
function remember() { $('#draft-status').textContent = saveDraft(storage, map) ? 'Your draft is saved on this device.' : 'Saving is unavailable. You can still export a valid map.'; }
function render() {
  const focusedAt = document.activeElement?.closest('.tile')?.dataset.at;
  const level = authoredLevel(map), { graph } = network(level, level.solution);
  $('#maker-board').style.setProperty('--columns', 3);
  $('#maker-board').innerHTML = level.cards.map((card, index) => {
    const connected = graph[index].filter(edge => edge.type === 'road').map(edge => (edge.direction - card.rotation + 4) % 4);
    const visited = preview?.steps.some(step => step.at === index);
    return `<div class="tile ${selected === index ? 'selected' : ''} ${visited ? 'visited' : ''}" data-at="${index}"><button class="tile-select" data-at="${index}" aria-label="Edit postcard ${index + 1}: ${escape(card.name)}" aria-pressed="${selected === index}"><span class="art-window"><span class="rotating-art" style="transform:rotate(${card.rotation * 90}deg)">${postcardArt(card, connected, graph[index].some(edge => edge.type === 'echo'))}</span></span><span class="tile-caption"><span>${escape(card.name)}</span><span class="card-number">${index + 1}</span></span></button>${card.locked ? '<span class="pin-label" aria-hidden="true">⌖ PINNED</span>' : ''}${card.stamp ? '<span class="stamp" aria-hidden="true">✳</span>' : ''}</div>`;
  }).join('');
  if (focusedAt !== undefined) $(`.tile[data-at="${focusedAt}"] .tile-select`)?.focus({ preventScroll: true });
  const card = map.cards[selected], pinned = selected === 0 || selected === 5;
  $('#map-title').value = map.title;
  $('#selected-label').textContent = `POSTCARD ${String(selected + 1).padStart(2, '0')}${pinned ? ' · PINNED' : ''}`;
  $('#selected-name').textContent = card.name;
  $('#landmark').innerHTML = pinned ? `<option value="${card.art}">${selected === 0 ? 'Departure house' : 'Delivery house'}</option>` : Object.entries(LANDMARKS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
  $('#landmark').value = card.art; $('#landmark').disabled = pinned;
  $('#card-name').value = card.name;
  $('#roads').value = card.ports.join(',');
  $('#orientation-label').textContent = `Facing ${compass[card.rotation]}`;
  $('#stamp').checked = card.stamp; $('#stamp').disabled = pinned;
  $('#echo').value = card.echo || ''; $('#echo').disabled = pinned;
  $('#pinned-note').hidden = !pinned;
  $('#maker-undo').disabled = !history.length;
  const validation = validateMap(map);
  $('#validation').textContent = `${validation.valid ? '✓ ' : '↗ '}${validation.message}`;
  $('#play-map').disabled = !validation.valid;
  $('#export-map').disabled = !validation.valid;
}

function edit(mutator) {
  const candidate = copyMap(map); mutator(candidate);
  try { normalizeMap(candidate); } catch (error) { notice(error.message); render(); return; }
  if (JSON.stringify(candidate) === JSON.stringify(map)) return;
  history.push(copyMap(map)); if (history.length > 100) history.shift();
  map = normalizeMap(candidate); preview = null; notice(''); render(); remember();
}
function replace(next) { edit(candidate => { candidate.title = next.title; candidate.cards = next.cards; }); }
$('#maker-board').addEventListener('click', event => { const button = event.target.closest('.tile-select'); if (button) { selected = Number(button.dataset.at); render(); } });
$('#map-title').addEventListener('change', event => edit(candidate => { candidate.title = event.target.value; }));
$('#card-name').addEventListener('change', event => edit(candidate => { candidate.cards[selected].name = event.target.value; }));
$('#landmark').addEventListener('change', event => edit(candidate => { candidate.cards[selected].art = event.target.value; }));
$('#roads').addEventListener('change', event => edit(candidate => { candidate.cards[selected].ports = event.target.value ? event.target.value.split(',').map(Number) : []; }));
$('#stamp').addEventListener('change', event => edit(candidate => { candidate.cards[selected].stamp = event.target.checked; }));
$('#echo').addEventListener('change', event => edit(candidate => { candidate.cards[selected].echo = event.target.value || null; }));
$('#maker-turn').addEventListener('click', () => edit(candidate => { candidate.cards[selected].rotation = (candidate.cards[selected].rotation + 1) % 4; }));
$('#maker-undo').addEventListener('click', () => { if (!history.length) return; map = history.pop(); preview = null; notice('One edit back.'); render(); remember(); });
$('#maker-reset').addEventListener('click', () => { replace(exampleMap()); notice('A fresh blue echo. Undo brings your previous map back.'); });
$('#validate').addEventListener('click', () => { const result = validateMap(map); preview = result.journey; render(); notice(result.valid ? 'The highlighted postcards belong to one legal journey.' : 'Keep shaping the world. Export and play unlock when a route is valid.'); });
$('#play-map').addEventListener('click', () => {
  try { publishMap(storage, map, Date.now() >>> 0); location.href = '/?your-map=1'; }
  catch { notice('This browser could not save the playable map. You can export it instead.'); }
});
$('#export-map').addEventListener('click', () => {
  const result = validateMap(map); if (!result.valid) { notice(result.message); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result.map, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `elsewhere-${map.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,50)}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('A little world, packed as JSON. It contains your map design, not your game progress.');
});
$('#import-map').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { if (file.size > MAX_MAP_BYTES) throw new Error('Choose a postcard JSON file smaller than 32 KiB.'); replace(parseMap(await file.text())); notice('Map imported. Check its route before export or play.'); }
  catch (error) { notice(`Import kept your current map. ${error.message}`); }
  finally { event.target.value = ''; }
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
  const tile = event.target.closest('.tile');
  if (tile && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault(); const at = Number(tile.dataset.at), delta = { ArrowUp:-3, ArrowDown:3, ArrowLeft:-1, ArrowRight:1 }[event.key], next = at + delta;
    if (next >= 0 && next < 6 && (Math.abs(delta) !== 1 || Math.floor(at / 3) === Math.floor(next / 3))) $(`.tile[data-at="${next}"] .tile-select`).focus();
  }
});
render(); remember();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
