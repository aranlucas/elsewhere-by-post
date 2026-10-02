import { LEVELS as BUILTIN_LEVELS, compass } from './levels.js';
import { readPublishedLevel } from './custom-map.js';
import { copyBoard, definition, portsFor, equalBoards, changeBoard, network, traceJourney, nextHint, remixBoard } from './engine.js';
import { loadSave, persistSave } from './storage.js';
import { postcardArt, icons } from './art.js';

const $ = selector => document.querySelector(selector);
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const LEVELS = [...BUILTIN_LEVELS];
const customLevel = readPublishedLevel(storage);
if (customLevel) LEVELS.push(customLevel);
let save = loadSave(storage, LEVELS), levelIndex = customLevel && new URLSearchParams(location.search).has('your-map') ? LEVELS.length - 1 : save.levelIndex;
let level, board, moves, history, selected = null, busy = false, delivered = false, hintVisible = false;
let preview = null, collected = new Set(), activeAt = null, tripToken = 0, audio;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let storageFailed = !storage;
const letters = LEVELS.map((_, index) => String(index + 1).padStart(2, '0'));
const journeyNames = ['Turn', 'Swap', 'Wander', 'Echo', 'Detour', 'Elsewhere', 'Yours'];

$('#app').innerHTML = `
  <main class="desk">
    <header class="masthead">
      <div class="edition"><span class="logo">${icons.envelope}</span><span>THE ELSEWHERE POSTAL SERVICE<br><b>A LITTLE EXPERIMENT IN GETTING THERE</b></span></div>
      <button class="quiet help-open" aria-label="How to play">How to play <span class="question">?</span></button>
    </header>
    <section class="intro" aria-labelledby="game-title">
      <div><p class="eyebrow">SIX POSTCARDS FROM AN IMPOSSIBLE WORLD</p><h1 id="game-title">Elsewhere,<br><em>by Post.</em></h1></div>
      <div class="intro-note"><span class="hand-drawn-star">✳</span><p><span>Turn a place.</span><br><span>Swap the world.</span><br><b>Deliver a little wonder.</b></p></div>
    </section>
    <nav class="journeys" aria-label="Choose a journey"></nav>
    <section class="play-area" aria-labelledby="level-title">
      <div class="map-area">
        <div class="map-heading"><div><span class="eyebrow" id="chapter"></span><h2 id="level-title"></h2></div><span class="move-count" id="moves"></span></div>
        <div class="map-frame">
          <div class="frame-note"><span>POSTCARDS MAY SHIFT IN TRANSIT</span><span>↗ N</span></div>
          <div class="map-stage"><div id="board" class="board" tabindex="-1" role="group" aria-label="Postcard map"></div><svg class="trip-lines" aria-hidden="true"></svg><div class="courier" aria-hidden="true">${icons.envelope}</div></div>
          <div class="map-legend"><span><i class="legend-road"></i> edge to edge</span><span id="echo-legend"></span><span>⌖ pinned in place</span></div>
        </div>
        <div class="map-tools"><button id="undo" class="tool">${icons.undo} Undo <kbd>U</kbd></button><button id="reset" class="tool">${icons.reset} Reset</button><button id="turn" class="tool turn-tool">${icons.turn} Turn card <kbd>R</kbd></button></div>
        <p class="selection-note" id="selection-note">Select a postcard to turn it, or two to swap them.</p>
      </div>
      <aside class="dispatch" aria-label="Delivery desk">
        <div class="letter"><span class="letter-corner"></span><p class="eyebrow">A NOTE FROM ELSEWHERE</p><p id="letter-text"></p><span class="letter-signature">with love, the map</span><div class="postmark" aria-hidden="true">ELSEWHERE<br><span>02 · 10 · 26</span><br>BY AIR & IMAGINATION</div></div>
        <div class="mission"><span class="eyebrow">YOUR LITTLE JOURNEY</span><p id="lesson"></p><div id="stamp-list" class="stamp-list" aria-label="Required postage stamps"></div><div id="echo-status" class="echo-status"></div></div>
        <button id="send" class="send">Send the courier ${icons.arrow}</button>
        <div class="status-wrap"><p id="status" role="status" aria-live="polite" aria-atomic="true">Ready when you are.</p><p id="status-detail"></p></div>
        <div id="delivery" class="delivery" hidden><span class="delivered-mark">DELIVERED ✓</span><p id="delivery-copy"></p><button id="next" class="next">Next postcard ${icons.arrow}</button><button id="remix" class="quiet">Shuffle this map again ↗</button></div>
        <div class="hint-area"><button id="hint" class="quiet" aria-expanded="false" aria-controls="hint-content">${icons.spark} A little nudge</button><div id="hint-content" hidden><p id="hint-copy"></p><button id="apply-hint" class="hint-apply">Place one card for me</button></div></div>
      </aside>
    </section>
    <footer><span id="save-status">Your desk is saved on this device.</span><label class="sound-option"><input id="sound" type="checkbox" /> Soft sounds</label><a class="maker-link" href="/maker.html">Make your own map ↗</a><span class="footer-motto">No clock. No wrong turns.</span></footer>
  </main>
  <dialog id="help" aria-labelledby="help-title"><button class="close-help" aria-label="Close instructions">×</button><span class="eyebrow">WELCOME TO ELSEWHERE</span><h2 id="help-title">The world is a postcard.</h2><p>Make a route from the <b>departure house</b> to the <b>delivery house</b>. Collect every round postage stamp along the way.</p><ol><li><b>Turn:</b> select a postcard, then press Turn card or <kbd>R</kbd>. The little ↻ button turns it too.</li><li><b>Swap:</b> tap two postcards, or drag one onto another. Cards marked ⌖ are pinned.</li><li><b>Send:</b> the courier follows connected roads. If a route is incomplete, it shows how far it can get. Try as often as you like.</li></ol><div class="echo-explainer"><span>↟</span><p><b>A small impossibility, from journey 04:</b> matching echo doors join distant postcards when both arrows point the same way. Each pair can be crossed once per journey.</p></div><p class="keyboard-guide"><b>Keyboard:</b> Tab to a card; arrow keys move focus. Enter selects. R turns (Shift+R turns back), U undoes, P sends, Escape clears selection. All actions also have buttons.</p><button class="send close-help">Let’s get pleasantly lost ${icons.arrow}</button></dialog>
`;

function selectLevel(index) {
  tripToken++;
  busy = false; preview = null; activeAt = null; collected.clear(); delivered = false; selected = null; hintVisible = false;
  levelIndex = index; level = LEVELS[index];
  const saved = save.levels[level.id];
  board = copyBoard(saved?.board || level.initial); moves = saved?.moves || 0; history = saved?.history || [];
  $('#level-title').textContent = level.title;
  $('#chapter').textContent = `JOURNEY ${letters[index]} / ${letters.length}`;
  $('#letter-text').textContent = level.letter;
  $('#lesson').textContent = level.lesson;
  $('#echo-legend').innerHTML = level.requiredEchoes.length ? '<i class="legend-echo"></i> echo to echo' : '<span>○ collect each stamp</span>';
  $('#hint-copy').textContent = level.hint;
  $('#hint-content').hidden = true;
  $('#hint').setAttribute('aria-expanded', 'false');
  $('#delivery').hidden = true;
  $('.courier').classList.remove('visible');
  $('.trip-lines').innerHTML = '';
  setStatus('Ready when you are.', '');
  render(); remember();
}

function remember() {
  save.levelIndex = levelIndex;
  save.levels[level.id] = { board: copyBoard(board), moves, history: history.slice(-100) };
  const ok = persistSave(storage, save);
  storageFailed = !ok;
  $('#save-status').textContent = ok ? 'Your desk is saved on this device.' : 'Saving is unavailable. This desk lasts for this visit.';
}

function setStatus(text, detail = '', mood = '') {
  $('#status').textContent = text;
  $('#status').dataset.mood = mood;
  $('#status-detail').textContent = detail;
}

function render(oldBoard, turnDelta) {
  const focusedId = document.activeElement?.dataset.focus;
  const oldRects = new Map(Array.from(document.querySelectorAll('.tile')).map(el => [el.dataset.id, el.getBoundingClientRect()]));
  const { graph } = network(level, board);
  $('#board').style.setProperty('--columns', level.columns);
  $('#board').dataset.size = board.length;
  $('#board').innerHTML = board.map((tile, i) => {
    const card = definition(level, tile.id), ports = portsFor(level, tile);
    const connected = graph[i].filter(edge => edge.type === 'road').map(edge => (edge.direction - tile.rotation + 4) % 4);
    const echoActive = graph[i].some(edge => edge.type === 'echo');
    const visited = preview?.steps.some(step => step.at === i);
    const label = `${card.name}. ${card.locked ? 'Pinned. ' : ''}${ports.length ? `Roads ${ports.map(port => compass[port]).join(' and ')}.` : 'No roads.'}${card.echo ? ` ${card.echo} echo door facing ${compass[tile.rotation]}. ${echoActive ? 'Linked.' : 'Unlinked.'}` : ''}${card.stamp ? ' Collect a stamp here.' : ''}`;
    return `<div class="tile ${selected === i ? 'selected' : ''} ${card.locked ? 'pinned' : ''} ${visited ? 'visited' : ''} ${activeAt === i ? 'active' : ''}" data-id="${tile.id}" data-at="${i}">
      <button class="tile-select" data-at="${i}" data-focus="card-${tile.id}" aria-label="${escape(label)}" aria-pressed="${selected === i}" ${busy ? 'disabled' : ''}>
        <span class="art-window"><span class="rotating-art" style="transform:rotate(${tile.rotation * 90}deg)">${postcardArt(card, connected, echoActive)}</span></span>
        <span class="tile-caption"><span>${escape(card.name)}</span><span class="card-number">${String(i + 1).padStart(2, '0')}</span></span>
      </button>
      ${card.locked ? `<span class="pin-label" aria-hidden="true">⌖ ${tile.id === level.start ? 'START' : 'POST'}</span>` : `<button class="tile-turn" data-at="${i}" data-focus="turn-${tile.id}" aria-label="Turn ${escape(card.name)} clockwise" ${busy ? 'disabled' : ''}>↻</button>`}
      ${card.stamp ? `<span class="stamp ${collected.has(card.id) ? 'collected' : ''}" aria-hidden="true">${collected.has(card.id) ? '✓' : '✳'}</span>` : ''}
    </div>`;
  }).join('');
  if (oldBoard && !reduced.matches) {
    document.querySelectorAll('.tile').forEach(el => {
      const previous = oldRects.get(el.dataset.id), now = el.getBoundingClientRect();
      if (previous && (previous.x !== now.x || previous.y !== now.y)) el.animate([{ transform: `translate(${previous.x - now.x}px,${previous.y - now.y}px) rotate(-3deg)`, zIndex: 4 }, { transform: 'translate(0,0) rotate(0)', zIndex: 4 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' });
      const oldTile = oldBoard.find(tile => tile.id === el.dataset.id), newTile = board.find(tile => tile.id === el.dataset.id);
      const difference = oldTile ? (newTile.rotation - oldTile.rotation + 4) % 4 : 0;
      const delta = turnDelta || (difference === 3 ? -1 : difference);
      if (oldTile && oldTile.rotation !== newTile.rotation) el.querySelector('.rotating-art').animate([{ transform: `rotate(${oldTile.rotation * 90}deg)` }, { transform: `rotate(${(oldTile.rotation + delta) * 90}deg)` }], { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });
  }
  if (focusedId) document.querySelector(`[data-focus="${focusedId}"]`)?.focus({ preventScroll: true });
  $('.journeys').innerHTML = LEVELS.map((item, i) => `<button class="journey ${i === levelIndex ? 'current' : ''} ${save.completed.includes(item.id) ? 'complete' : ''}" data-level="${i}" aria-label="Journey ${i + 1}: ${escape(item.title)}${save.completed.includes(item.id) ? ', delivered' : ''}" ${i === levelIndex ? 'aria-current="step"' : ''}><span>${letters[i]}</span><span class="journey-label">${journeyNames[i]}</span><span class="journey-check" aria-hidden="true">${save.completed.includes(item.id) ? '✓' : '·'}</span></button>`).join('');
  $('#moves').textContent = `${moves} ${moves === 1 ? 'move' : 'moves'}`;
  $('#undo').disabled = busy || !history.length;
  $('#reset').disabled = busy;
  $('#turn').disabled = busy || selected === null || definition(level, board[selected].id).locked;
  $('#hint').disabled = busy;
  $('#apply-hint').disabled = busy;
  $('#send').innerHTML = busy ? `Stop the courier <span aria-hidden="true">□</span>` : `Send the courier ${icons.arrow}`;
  $('#selection-note').textContent = selected === null ? 'Select a postcard to turn it, or two to swap them.' : `${definition(level, board[selected].id).name} selected. Turn it, or choose another postcard to swap.`;
  $('#stamp-list').innerHTML = level.cards.filter(card => card.stamp).map(card => `<span class="stamp-chip ${collected.has(card.id) ? 'collected' : ''}" title="${escape(card.name)}" aria-label="${escape(card.name)} stamp${collected.has(card.id) ? ', collected' : ''}">${collected.has(card.id) ? '✓' : '✳'}<span>${escape(card.name.replace('Little ', '').replace('Pocket ', '').replace('Upside-down ', '').replace('Floating ', ''))}</span></span>`).join('');
  $('#echo-status').innerHTML = level.requiredEchoes.map(echo => {
    const pair = board.map((tile, i) => definition(level, tile.id).echo === echo ? i : -1).filter(i => i >= 0);
    const linked = board[pair[0]].rotation === board[pair[1]].rotation;
    return `<span class="echo-chip ${echo} ${linked ? 'linked' : ''}"><i></i>${echo === 'blue' ? 'Blue' : 'Coral'} echo: ${linked ? `linked ${compass[board[pair[0]].rotation]}` : 'arrows disagree'}</span>`;
  }).join('');
  $('#sound').checked = save.sound;
}

function clearTrip() {
  tripToken++; busy = false; preview = null; activeAt = null; collected.clear(); delivered = false;
  $('#delivery').hidden = true; $('.courier').classList.remove('visible'); $('.trip-lines').innerHTML = '';
}

function perform(action, announce = true) {
  if (busy) return;
  const next = changeBoard(level, board, action);
  if (equalBoards(next, board)) return;
  const old = copyBoard(board);
  history.push({ board: old, moves }); if (history.length > 100) history.shift();
  board = next; moves++; clearTrip();
  // Direct turn buttons and keyboard turns do not implicitly arm a swap.
  // A deliberately selected card stays selected for repeated toolbar turns.
  selected = action.type === 'swap' || selected !== action.at ? null : selected;
  if (announce) setStatus(action.type === 'swap' ? 'A change of scenery.' : 'A new perspective.', action.type === 'swap' ? 'The roads moved with their postcards.' : `Now facing ${compass[board[action.at].rotation]}.`);
  render(old, action.counterclockwise ? -1 : 1); remember(); tone(action.type === 'swap' ? 440 : 330, .06);
}

function selectCard(i) {
  if (busy) return;
  if (definition(level, board[i].id).locked) { selected = null; setStatus('This place is pinned.', 'Departure and delivery stay put. Move the world around them.'); render(); return; }
  if (selected === i) selected = null;
  else if (selected !== null) { perform({ type: 'swap', at: selected, to: i }); return; }
  else selected = i;
  render();
}

function undo() {
  if (busy || !history.length) return;
  const old = copyBoard(board), previous = history.pop();
  board = previous.board; moves = previous.moves; selected = null; clearTrip();
  setStatus('One step back.', 'A good way to find a new way forward.'); render(old); remember();
}

function reset() {
  if (busy) return;
  const old = copyBoard(board); board = copyBoard(level.initial); moves = 0; history = []; selected = null; clearTrip();
  setStatus('A fresh little world.', 'The postcards are back where they began.'); render(old); remember();
}

function tone(frequency, duration = .12) {
  if (!save.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Sound is optional; a silent visit remains complete. */ }
}

function pointAt(index) {
  const tile = document.querySelector(`.tile[data-at="${index}"] .art-window`).getBoundingClientRect();
  const stage = $('.map-stage').getBoundingClientRect();
  return { x: tile.x - stage.x + tile.width / 2, y: tile.y - stage.y + tile.height / 2 };
}

function drawTrail(journey, through) {
  const stage = $('.map-stage'), svg = $('.trip-lines');
  svg.setAttribute('viewBox', `0 0 ${stage.clientWidth} ${stage.clientHeight}`);
  svg.innerHTML = journey.steps.slice(1, through + 1).map((step, index) => {
    const a = pointAt(journey.steps[index].at), b = pointAt(step.at);
    if (step.via.type === 'echo') return `<path class="echo-trail ${step.via.echo}" d="M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 55} ${b.x} ${b.y}"/>`;
    return `<path class="road-trail" d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;
  }).join('');
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function sendCourier() {
  if (busy) { clearTrip(); setStatus('The courier is back at the desk.', 'Your map is ready to rearrange.'); render(); return; }
  const token = ++tripToken;
  busy = true; selected = null; delivered = false; collected.clear(); preview = traceJourney(level, board); $('#delivery').hidden = true;
  setStatus('A little letter, on its way…', 'Following the roads and listening for echoes.'); render();
  const courier = $('.courier'); courier.classList.add('visible');
  for (let i = 0; i < preview.steps.length; i++) {
    if (token !== tripToken) return;
    const step = preview.steps[i], point = pointAt(step.at);
    courier.style.setProperty('--courier-x', `${point.x}px`); courier.style.setProperty('--courier-y', `${point.y}px`);
    courier.classList.toggle('echoing', step.via?.type === 'echo');
    await delay(reduced.matches ? 20 : i === 0 ? 180 : step.via?.type === 'echo' ? 650 : 420);
    if (token !== tripToken) return;
    activeAt = step.at;
    const card = definition(level, board[step.at].id);
    if (card.stamp && !collected.has(card.id)) { collected.add(card.id); tone(520 + collected.size * 65, .16); }
    render(); drawTrail(preview, i);
  }
  if (token !== tripToken) return;
  busy = false; courier.classList.remove('echoing');
  if (preview.success) {
    delivered = true;
    if (!save.completed.includes(level.id)) save.completed.push(level.id);
    const finished = save.completed.length === LEVELS.length;
    setStatus('Delivered. Beautifully improbable.', `${collected.size} ${collected.size === 1 ? 'stamp' : 'stamps'} collected${preview.usedEchoes.length ? ` · ${preview.usedEchoes.length} ${preview.usedEchoes.length === 1 ? 'echo crossed' : 'echoes crossed'}` : ''}.`, 'success');
    $('#delivery').hidden = false;
    $('#delivery-copy').textContent = finished ? 'Every letter found its way. The world is yours to reshuffle.' : `A small miracle for ${level.place.toLowerCase()}.`;
    $('#next').innerHTML = `${levelIndex === LEVELS.length - 1 ? 'Back to the first postcard' : 'Next postcard'} ${icons.arrow}`;
    tone(880, .3);
  } else {
    const missingNames = preview.missing.map(id => definition(level, id).name);
    setStatus(preview.steps.length === 1 ? 'A road is waiting to meet.' : 'Nearly somewhere.', missingNames.length ? `Still need: ${missingNames.join(', ')}. Turn or swap a postcard, then try again.` : preview.missingEchoes.length ? `Use the ${preview.missingEchoes.join(' and ')} echo on the journey. Align its arrows.` : 'The stamps are collected. Now connect the last road to delivery.', 'retry');
  }
  render(); drawTrail(preview, preview.steps.length - 1); remember();
}

$('#board').addEventListener('click', event => {
  const turn = event.target.closest('.tile-turn');
  if (turn) { perform({ type: 'rotate', at: Number(turn.dataset.at) }); return; }
  const tile = event.target.closest('.tile-select'); if (tile) selectCard(Number(tile.dataset.at));
});
$('.journeys').addEventListener('click', event => { const button = event.target.closest('[data-level]'); if (button) selectLevel(Number(button.dataset.level)); });
$('#turn').addEventListener('click', () => { if (selected !== null) perform({ type: 'rotate', at: selected }); });
$('#undo').addEventListener('click', undo); $('#reset').addEventListener('click', reset); $('#send').addEventListener('click', sendCourier);
$('#next').addEventListener('click', () => { selectLevel((levelIndex + 1) % LEVELS.length); $('#level-title').scrollIntoView({ block: 'start', behavior: reduced.matches ? 'instant' : 'smooth' }); });
$('#remix').addEventListener('click', () => {
  const old = copyBoard(board); board = remixBoard(level, Date.now()); moves = 0; history = []; selected = null; clearTrip();
  setStatus('Same places. A fresh impossibility.', 'This shuffle has a route. Your nudge still works.'); render(old); remember();
});
$('#hint').addEventListener('click', () => { hintVisible = !hintVisible; $('#hint-content').hidden = !hintVisible; $('#hint').setAttribute('aria-expanded', String(hintVisible)); });
$('#apply-hint').addEventListener('click', () => {
  const action = nextHint(level, board);
  if (action) { perform(action, false); setStatus('A little help from the map.', 'One postcard moved toward an authored solution. You can undo it.'); }
  else setStatus('Your journey is ready.', 'Send the courier and watch the world connect.');
});
$('#sound').addEventListener('change', event => { save.sound = event.target.checked; remember(); tone(660, .15); });
$('.help-open').addEventListener('click', () => $('#help').showModal());
document.querySelectorAll('.close-help').forEach(button => button.addEventListener('click', () => $('#help').close()));
$('#help').addEventListener('click', event => { if (event.target === $('#help')) { const r = $('#help').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('#help').close(); } });

document.addEventListener('keydown', event => {
  if ($('#help').open || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  const card = event.target.closest('.tile');
  const key = event.key.toLowerCase();
  if (key === 'r') { event.preventDefault(); const at = selected ?? (card ? Number(card.dataset.at) : null); if (at !== null) perform({ type: 'rotate', at, counterclockwise: event.shiftKey }); }
  else if (key === 'u') { event.preventDefault(); undo(); }
  else if (key === 'p') { event.preventDefault(); sendCourier(); }
  else if (key === 'escape') { selected = null; render(); }
  else if (card && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); const at = Number(card.dataset.at), delta = { ArrowUp: -level.columns, ArrowDown: level.columns, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    const next = at + delta;
    if (next >= 0 && next < board.length && (Math.abs(delta) !== 1 || Math.floor(at / level.columns) === Math.floor(next / level.columns))) document.querySelector(`.tile[data-at="${next}"] .tile-select`).focus();
  }
});

// Pointer drag supplements tap-to-swap; it never replaces the accessible controls.
let drag = null, suppressedRelease = null;
$('#board').addEventListener('pointerdown', event => {
  const tile = event.target.closest('.tile-select');
  if (!tile || busy || event.button !== 0 || definition(level, board[Number(tile.dataset.at)].id).locked) return;
  drag = { at: Number(tile.dataset.at), x: event.clientX, y: event.clientY, moved: false, element: tile.closest('.tile') };
});
document.addEventListener('pointermove', event => {
  if (!drag) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 14) drag.moved = true;
  if (!drag.moved) return;
  drag.element.classList.add('dragging');
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.tile');
  if (target && Number(target.dataset.at) !== drag.at && !definition(level, board[Number(target.dataset.at)].id).locked) target.classList.add('drop-target');
});
document.addEventListener('pointerup', event => {
  if (!drag) return;
  const current = drag; drag = null; current.element.classList.remove('dragging');
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  if (!current.moved) return;
  suppressedRelease = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.tile');
  if (target) perform({ type: 'swap', at: current.at, to: Number(target.dataset.at) });
});
document.addEventListener('pointercancel', () => { drag?.element.classList.remove('dragging'); drag = null; document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target')); });
$('#board').addEventListener('click', event => {
  const release = suppressedRelease; suppressedRelease = null;
  if (release && event.timeStamp - release.time < 100 && Math.hypot(event.clientX - release.x, event.clientY - release.y) < 3) { event.stopImmediatePropagation(); event.preventDefault(); }
}, true);

window.addEventListener('resize', () => { if (preview && !busy) drawTrail(preview, preview.steps.length - 1); if (activeAt !== null) { const point = pointAt(activeAt); $('.courier').style.setProperty('--courier-x', `${point.x}px`); $('.courier').style.setProperty('--courier-y', `${point.y}px`); } });
window.addEventListener('offline', () => { $('#save-status').textContent = 'Offline, and happily here. Your desk is saved locally.'; });
window.addEventListener('online', () => remember());
selectLevel(levelIndex);
if (new URLSearchParams(location.search).has('your-map')) {
  const url = new URL(location.href); url.searchParams.delete('your-map');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* First visits still play if caching is unavailable. */ });
