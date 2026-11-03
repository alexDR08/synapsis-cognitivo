// Pruebas de la API de actividad con un Firestore en memoria:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const logic = require('./activityLogic');
const createActivityRouter = require('./activity');
const { FakeFirestore } = require('./testing/fakeFirestore');

// ---------- Reglas puras ----------
test('dayKey cambia a medianoche en la zona horaria indicada', () => {
  const tz = 'America/Mexico_City'; // UTC-6 (sin horario de verano desde 2022)
  assert.equal(logic.dayKey(new Date('2026-10-21T05:30:00Z'), tz), '2026-10-20'); // 23:30 locales
  assert.equal(logic.dayKey(new Date('2026-10-21T06:30:00Z'), tz), '2026-10-21'); // 00:30 locales
});

test('nextStreak: empieza, se mantiene el mismo día, suma al día siguiente y se reinicia con huecos', () => {
  let s = logic.nextStreak(null, '2026-10-20');
  assert.deepEqual(s, { current: 1, best: 1, lastDay: '2026-10-20' });
  s = logic.nextStreak(s, '2026-10-20');
  assert.equal(s.current, 1);
  s = logic.nextStreak(s, '2026-10-21');
  s = logic.nextStreak(s, '2026-10-22');
  assert.deepEqual(s, { current: 3, best: 3, lastDay: '2026-10-22' });
  s = logic.nextStreak(s, '2026-10-25'); // faltó 23 y 24
  assert.deepEqual(s, { current: 1, best: 3, lastDay: '2026-10-25' });
  s = logic.nextStreak({ current: 2, best: 2, lastDay: '2026-10-31' }, '2026-11-01'); // cambio de mes
  assert.equal(s.current, 3);
});

test('effectiveStreak: la racha se rompe si pasó más de un día', () => {
  const streak = { current: 4, best: 6, lastDay: '2026-10-20' };
  assert.deepEqual(logic.effectiveStreak(streak, '2026-10-20'), { current: 4, best: 6, lastDay: '2026-10-20', playedToday: true });
  assert.equal(logic.effectiveStreak(streak, '2026-10-21').current, 4); // aún puede jugar hoy
  assert.equal(logic.effectiveStreak(streak, '2026-10-22').current, 0);
  assert.equal(logic.effectiveStreak(null, '2026-10-22').current, 0);
});

test('parseAttempt valida juego, nivel, resultado y duración, y limpia las métricas', () => {
  assert.ok(logic.parseAttempt({ game: 'otro', level: 'facil', success: true }).error);
  assert.ok(logic.parseAttempt({ game: 'odd', level: 'fa cil', success: true }).error);
  assert.ok(logic.parseAttempt({ game: 'odd', level: 'facil' }).error);
  assert.ok(logic.parseAttempt({ game: 'odd', level: 'facil', success: true, durationSec: -1 }).error);
  const { value } = logic.parseAttempt({
    game: 'memory', level: 'medio', success: true, durationSec: 12.34,
    metrics: { moves: 9, record: true, note: 'x'.repeat(200), nested: { a: 1 }, 'mala clave': 1 },
  });
  assert.equal(value.durationSec, 12.3);
  assert.deepEqual(Object.keys(value.metrics).sort(), ['moves', 'note', 'record']);
  assert.equal(value.metrics.note.length, 60);
});

test('isBetter compara por juego', () => {
  const a = (metrics, durationSec = 10) => ({ success: true, metrics, durationSec });
  assert.equal(logic.isBetter('memory', a({ moves: 8 }), { moves: 9, durationSec: 5 }), true);
  assert.equal(logic.isBetter('memory', a({ moves: 9 }, 4), { moves: 9, durationSec: 5 }), true);
  assert.equal(logic.isBetter('memory', a({ moves: 10 }), { moves: 9, durationSec: 5 }), false);
  assert.equal(logic.isBetter('odd', a({ found: 0 }), null), false);
  assert.equal(logic.isBetter('odd', a({ found: 7, mistakes: 1 }), { found: 7, mistakes: 2 }), true);
  assert.equal(logic.isBetter('sequence', a({ length: 5 }), { length: 4 }), true);
  assert.equal(logic.isBetter('sequence', { success: false, metrics: { length: 9 } }, { length: 4 }), false);
});

// ---------- API con Firestore en memoria ----------
async function startApi({ db = new FakeFirestore(), start = '2026-10-20T18:00:00Z' } = {}) {
  let now = new Date(start);
  const verifyToken = (req, res, next) => {
    const user = req.headers['x-test-user'];
    if (!user) return res.status(401).json({ message: 'Acceso denegado.' });
    const [id, email] = user.split('|');
    req.user = { id, email };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/api/activity', createActivityRouter({ verifyToken, getDb: () => db, timezone: 'America/Mexico_City', clock: () => now }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/activity`;
  const call = async (method, path, body, user = 'u1|ana@uvp.edu.mx') => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  return { db, call, setNow: (iso) => { now = new Date(iso); }, close: () => server.close() };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('sin token se rechaza; con Firestore sin configurar responde 503', async () => {
  const api = await startApi();
  assert.equal((await api.call('GET', '/summary', undefined, null)).status, 401);
  api.close();

  const off = await startApi({ db: null });
  assert.equal((await off.call('GET', '/summary')).status, 503);
  off.close();
});

test('flujo completo: sesión, intentos, mejor marca, racha y resumen', async () => {
  const api = await startApi();
  const sid = 'sesion-abc-123';

  let r = await api.call('POST', '/sessions', { id: sid, provider: 'google', device: { language: 'es-MX', screen: '390x844' } });
  assert.equal(r.status, 201);
  r = await api.call('POST', '/sessions', { id: sid }); // reintento: no duplica
  assert.equal(r.status, 200);
  assert.equal(r.body.created, false);

  r = await api.call('POST', '/attempts', { id: 'intento-0001', sessionId: sid, game: 'memory', level: 'facil', success: true, durationSec: 31, metrics: { pairs: 4, moves: 9 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.newBest, true);
  assert.deepEqual(r.body.streak, { current: 1, best: 1, lastDay: '2026-10-20', playedToday: true });

  r = await api.call('POST', '/attempts', { id: 'intento-0001', sessionId: sid, game: 'memory', level: 'facil', success: true, durationSec: 31, metrics: { moves: 9 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.duplicate, true); // el mismo intento no cuenta dos veces

  await wait(3);
  r = await api.call('POST', '/attempts', { id: 'intento-0002', sessionId: sid, game: 'memory', level: 'facil', success: true, durationSec: 25, metrics: { pairs: 4, moves: 6 } });
  assert.equal(r.body.newBest, true);
  await wait(3);
  r = await api.call('POST', '/attempts', { id: 'intento-0003', sessionId: sid, game: 'sequence', level: 'medio', success: false, durationSec: 4, metrics: { length: 4 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.newBest, false);

  r = await api.call('POST', '/events', { sessionId: sid, type: 'level_selected', data: { game: 'odd', level: 'dificil' } });
  assert.equal(r.status, 201);
  assert.equal((await api.call('POST', '/events', { type: 'Tipo Malo' })).status, 400);
  assert.equal((await api.call('POST', '/attempts', { game: 'x', level: 'a', success: true })).status, 400);

  r = await api.call('POST', `/sessions/${sid}/ping`, { final: true });
  assert.equal(r.body.found, true);

  r = await api.call('GET', '/summary');
  assert.equal(r.status, 200);
  const s = r.body;
  assert.deepEqual(s.totals, { sessions: 1, attempts: 3, wins: 2, playSeconds: 60 });
  assert.equal(s.streak.current, 1);
  assert.deepEqual(s.games.memory.attempts, 2);
  assert.equal(s.games.memory.playSeconds, 56); // 31 + 25
  assert.equal(s.games.sequence.playSeconds, 4);
  assert.deepEqual(s.games.sequence.wins, 0);
  assert.equal(s.bests.memory_facil.moves, 6);
  assert.equal(s.bests.memory_facil.durationSec, 25);
  assert.equal(s.recent.length, 3);
  assert.equal(s.recent[0].id, 'intento-0003'); // el más reciente primero

  // Lo guardado en Firestore: sesión con contadores y cierre; evento con su tipo
  const session = (await api.db.collection('users').doc('u1').collection('sessions').doc(sid).get()).data();
  assert.equal(session.attempts, 3);
  assert.equal(session.wins, 2);
  assert.equal(session.provider, 'google');
  assert.ok(session.endedAt);
  const events = (await api.db.collection('users').doc('u1').collection('events').get()).docs;
  assert.equal(events.length, 1);
  assert.equal(events[0].data().type, 'level_selected');

  // Otro usuario no ve nada de u1
  const other = (await api.call('GET', '/summary', undefined, 'u2|beto@uvp.mx')).body;
  assert.equal(other.totals.attempts, 0);
  assert.equal(other.recent.length, 0);
  api.close();
});

test('la racha sube día tras día y se rompe si se deja de jugar', async () => {
  const api = await startApi({ start: '2026-10-20T18:00:00Z' }); // 12:00 en CDMX
  const play = async (id) => (await api.call('POST', '/attempts', { id, game: 'odd', level: 'facil', success: true, durationSec: 45, metrics: { found: 5, mistakes: 0 } })).body.streak;

  assert.equal((await play('dia-uno-0001')).current, 1);
  api.setNow('2026-10-21T15:00:00Z');
  assert.equal((await play('dia-dos-0002')).current, 2);
  api.setNow('2026-10-22T07:00:00Z'); // 01:00 del 22 en CDMX
  assert.equal((await play('dia-tres-003')).current, 3);

  api.setNow('2026-10-23T18:00:00Z'); // aún no juega el 23: la racha sigue viva
  let s = (await api.call('GET', '/summary')).body.streak;
  assert.deepEqual([s.current, s.playedToday], [3, false]);

  api.setNow('2026-10-25T18:00:00Z'); // pasaron dos días sin jugar
  s = (await api.call('GET', '/summary')).body.streak;
  assert.deepEqual([s.current, s.best], [0, 3]);
  assert.equal((await play('dia-cinco-004')).current, 1);
  assert.equal((await api.call('GET', '/summary')).body.streak.best, 3);
  api.close();
});

test('una escritura que falla devuelve 500 en JSON y no tumba el servidor', async () => {
  const db = new FakeFirestore();
  db.runTransaction = async () => { throw new Error('boom'); };
  const api = await startApi({ db });
  const quiet = console.error; console.error = () => {};
  const r = await api.call('POST', '/attempts', { game: 'odd', level: 'facil', success: true });
  console.error = quiet;
  assert.equal(r.status, 500);
  assert.ok(r.body.message);
  assert.equal((await api.call('GET', '/summary')).status, 200);
  api.close();
});
