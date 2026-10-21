// Reglas puras de la actividad (sin Firebase): validación, días y rachas.
const crypto = require('crypto');

const GAMES = ['sequence', 'memory', 'odd'];
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const WORD_RE = /^[A-Za-z0-9_-]{1,30}$/;
const EVENT_RE = /^[a-z][a-z0-9_]{1,39}$/;
const MAX_DURATION_SECONDS = 2 * 60 * 60;

/** "2026-10-20" según la zona horaria indicada (el día de la racha cambia a medianoche local). */
function dayKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysBetween(fromDay, toDay) {
  const [y1, m1, d1] = fromDay.split('-').map(Number);
  const [y2, m2, d2] = toDay.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** Racha tras jugar hoy: mismo día no cambia, día siguiente suma, un hueco reinicia a 1. */
function nextStreak(previous, today) {
  const prev = previous || {};
  const best = prev.best || 0;
  let current;
  if (!prev.lastDay) current = 1;
  else {
    const gap = daysBetween(prev.lastDay, today);
    if (gap === 0) current = prev.current || 1;
    else if (gap === 1) current = (prev.current || 0) + 1;
    else if (gap > 1) current = 1;
    else return { current: prev.current || 1, best: Math.max(best, prev.current || 1), lastDay: prev.lastDay }; // reloj atrasado
  }
  return { current, best: Math.max(best, current), lastDay: today };
}

/** Lo que se muestra: si pasó más de un día sin jugar, la racha ya se rompió (0). */
function effectiveStreak(streak, today) {
  const s = streak || {};
  if (!s.lastDay) return { current: 0, best: s.best || 0, lastDay: null, playedToday: false };
  const gap = daysBetween(s.lastDay, today);
  return {
    current: gap <= 1 ? s.current || 0 : 0,
    best: s.best || 0,
    lastDay: s.lastDay,
    playedToday: gap === 0,
  };
}

/** Copia un objeto "plano" con límites: solo números, booleanos y textos cortos. */
function cleanMap(input, { maxKeys = 12, maxString = 60 } = {}) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input).slice(0, maxKeys)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
    else if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, maxString);
  }
  return out;
}

function newId() {
  return crypto.randomUUID();
}

function pickId(value) {
  return typeof value === 'string' && ID_RE.test(value) ? value : newId();
}

function parseAttempt(body = {}) {
  if (!GAMES.includes(body.game)) return { error: 'Juego no válido.' };
  if (typeof body.level !== 'string' || !WORD_RE.test(body.level)) return { error: 'Nivel no válido.' };
  if (typeof body.success !== 'boolean') return { error: 'Falta indicar si fue un acierto (success).' };
  const duration = Number(body.durationSec ?? 0);
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_DURATION_SECONDS) {
    return { error: 'Duración no válida.' };
  }
  return {
    value: {
      id: pickId(body.id),
      sessionId: typeof body.sessionId === 'string' && ID_RE.test(body.sessionId) ? body.sessionId : null,
      game: body.game,
      level: body.level,
      success: body.success,
      durationSec: Math.round(duration * 10) / 10,
      metrics: cleanMap(body.metrics),
    },
  };
}

function parseEvent(body = {}) {
  if (typeof body.type !== 'string' || !EVENT_RE.test(body.type)) return { error: 'Tipo de evento no válido.' };
  return {
    value: {
      type: body.type,
      sessionId: typeof body.sessionId === 'string' && ID_RE.test(body.sessionId) ? body.sessionId : null,
      data: cleanMap(body.data, { maxKeys: 20, maxString: 100 }),
    },
  };
}

/** ¿El intento nuevo supera a la mejor marca guardada? (solo cuentan los aciertos) */
function isBetter(game, candidate, best) {
  if (!candidate.success) return false;
  const m = candidate.metrics || {};
  if (!best) return game === 'odd' ? (m.found || 0) > 0 : true;
  if (game === 'sequence') return (m.length || 0) > (best.length || 0);
  if (game === 'memory') {
    const moves = m.moves ?? Infinity;
    if (moves !== best.moves) return moves < best.moves;
    return candidate.durationSec < best.durationSec;
  }
  if (game === 'odd') {
    if ((m.found || 0) !== (best.found || 0)) return (m.found || 0) > (best.found || 0);
    return (m.mistakes || 0) < (best.mistakes || 0);
  }
  return false;
}

/** Mejor marca con claves fijas por juego (así, al reemplazarla, no quedan campos viejos mezclados). */
function bestRecord(game, attempt) {
  const m = attempt.metrics || {};
  const base = { durationSec: attempt.durationSec };
  if (game === 'sequence') return { length: m.length || 0, ...base };
  if (game === 'memory') return { moves: m.moves || 0, ...base };
  return { found: m.found || 0, mistakes: m.mistakes || 0, ...base };
}

module.exports = {
  bestRecord,
  GAMES,
  dayKey,
  daysBetween,
  nextStreak,
  effectiveStreak,
  cleanMap,
  pickId,
  parseAttempt,
  parseEvent,
  isBetter,
};
