import { validBoard, copyBoard } from './engine.js';
export const SAVE_KEY = 'elsewhere-by-post-v1';
export function freshSave() { return { version: 1, levelIndex: 0, completed: [], levels: {}, sound: false }; }
export function decodeSave(raw, levels) {
  const fresh = freshSave();
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return fresh;
    fresh.levelIndex = Number.isInteger(data.levelIndex) && data.levelIndex >= 0 && data.levelIndex < levels.length ? data.levelIndex : 0;
    fresh.completed = [...new Set(Array.isArray(data.completed) ? data.completed.filter(id => levels.some(level => level.id === id)) : [])];
    fresh.sound = data.sound === true;
    for (const level of levels) {
      const saved = data.levels?.[level.id];
      if (!saved || !validBoard(level, saved.board)) continue;
      fresh.levels[level.id] = {
        board: copyBoard(saved.board), moves: Number.isInteger(saved.moves) && saved.moves >= 0 && saved.moves < 100000 ? saved.moves : 0,
        history: Array.isArray(saved.history) ? saved.history.slice(-100).filter(entry => entry && validBoard(level, entry.board) && Number.isInteger(entry.moves) && entry.moves >= 0).map(entry => ({ board: copyBoard(entry.board), moves: entry.moves })) : [],
      };
    }
  } catch { /* Empty, unavailable, old, or corrupt storage is a fresh desk. */ }
  return fresh;
}
export function loadSave(storage, levels) { try { return decodeSave(storage.getItem(SAVE_KEY), levels); } catch { return freshSave(); } }
export function persistSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }
