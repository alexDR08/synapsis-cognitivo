// API de actividad: sesiones, intentos, eventos y rachas guardados en Firestore.
//
// Estructura en Firestore (el id de usuario es el _id de MongoDB, el que va dentro del JWT):
//   users/{uid}                    perfil + contadores: totals, streak, games, bests
//   users/{uid}/sessions/{id}      una visita a la app (inicio, última actividad, fin, dispositivo)
//   users/{uid}/attempts/{id}      cada intento de un juego (juego, nivel, resultado, métricas)
//   users/{uid}/events/{autoId}    cualquier dato que surja sobre la marcha (tipo + datos)
const express = require('express');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const logic = require('./activityLogic');

const inc = (n = 1) => FieldValue.increment(n);

const toIso = (value) => (value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value ?? null);

function createActivityRouter({ verifyToken, getDb, timezone = 'America/Mexico_City', clock = () => new Date() }) {
  const router = express.Router();

  router.use(verifyToken);
  router.use((req, res, next) => {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, message: 'Firestore no está configurado en el servidor.' });
    req.db = db;
    req.uid = String(req.user.id);
    next();
  });

  const userRef = (req) => req.db.collection('users').doc(req.uid);
  const username = (req) => String(req.user.email || '').split('@')[0];

  // 1. Inicia (o reanuda) una sesión. El id lo genera el navegador para poder reintentar sin duplicar.
  router.post('/sessions', async (req, res) => {
    const id = logic.pickId(req.body?.id);
    const provider = ['password', 'google'].includes(req.body?.provider) ? req.body.provider : 'unknown';
    const device = logic.cleanMap(req.body?.device, { maxKeys: 8, maxString: 160 });
    const sessionRef = userRef(req).collection('sessions').doc(id);

    const created = await req.db.runTransaction(async (tx) => {
      const [userSnap, sessionSnap] = await Promise.all([tx.get(userRef(req)), tx.get(sessionRef)]);
      if (sessionSnap.exists) {
        tx.set(sessionRef, { lastSeenAt: FieldValue.serverTimestamp() }, { merge: true });
        return false;
      }
      tx.set(sessionRef, {
        startedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        endedAt: null,
        durationSec: 0,
        provider,
        device,
        attempts: 0,
        wins: 0,
      });
      tx.set(
        userRef(req),
        {
          email: req.user.email,
          username: username(req),
          lastSeenAt: FieldValue.serverTimestamp(),
          ...(userSnap.exists && userSnap.get('createdAt') ? {} : { createdAt: FieldValue.serverTimestamp() }),
          totals: { sessions: inc(1) },
        },
        { merge: true },
      );
      return true;
    });

    res.status(created ? 201 : 200).json({ ok: true, id, created });
  });

  // 2. Latido / cierre de sesión. `final: true` marca el cierre (cerrar sesión).
  router.post('/sessions/:id/ping', async (req, res) => {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(req.params.id)) return res.status(400).json({ ok: false, message: 'Sesión no válida.' });
    const ref = userRef(req).collection('sessions').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.json({ ok: true, found: false });

    const started = snap.get('startedAt');
    const seconds = started ? Math.max(0, Math.round((clock().getTime() - started.toMillis()) / 1000)) : 0;
    await ref.set(
      {
        lastSeenAt: FieldValue.serverTimestamp(),
        durationSec: Math.min(seconds, 24 * 3600),
        ...(req.body?.final === true ? { endedAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );
    res.json({ ok: true, found: true });
  });

  // 3. Registra un intento: lo guarda, actualiza contadores, mejores marcas y la racha, todo en una transacción.
  router.post('/attempts', async (req, res) => {
    const parsed = logic.parseAttempt(req.body);
    if (parsed.error) return res.status(400).json({ ok: false, message: parsed.error });
    const attempt = parsed.value;

    const now = clock();
    const today = logic.dayKey(now, timezone);
    const attemptRef = userRef(req).collection('attempts').doc(attempt.id);
    const sessionRef = attempt.sessionId ? userRef(req).collection('sessions').doc(attempt.sessionId) : null;

    const result = await req.db.runTransaction(async (tx) => {
      // En Firestore todas las lecturas van antes que las escrituras.
      const [userSnap, attemptSnap, sessionSnap] = await Promise.all([
        tx.get(userRef(req)),
        tx.get(attemptRef),
        sessionRef ? tx.get(sessionRef) : Promise.resolve(null),
      ]);

      const previousStreak = userSnap.exists ? userSnap.get('streak') : null;
      if (attemptSnap.exists) {
        return { duplicate: true, streak: logic.effectiveStreak(previousStreak, today), newBest: false };
      }

      const streak = logic.nextStreak(previousStreak, today);
      const bestKey = `${attempt.game}_${attempt.level}`;
      const previousBest = userSnap.exists ? userSnap.get(`bests.${bestKey}`) : null;
      const newBest = logic.isBetter(attempt.game, attempt, previousBest);

      tx.set(attemptRef, {
        game: attempt.game,
        level: attempt.level,
        success: attempt.success,
        durationSec: attempt.durationSec,
        metrics: attempt.metrics,
        sessionId: attempt.sessionId,
        day: today,
        at: FieldValue.serverTimestamp(),
      });

      tx.set(
        userRef(req),
        {
          email: req.user.email,
          username: username(req),
          lastSeenAt: FieldValue.serverTimestamp(),
          ...(userSnap.exists && userSnap.get('createdAt') ? {} : { createdAt: FieldValue.serverTimestamp() }),
          streak,
          totals: {
            attempts: inc(1),
            wins: inc(attempt.success ? 1 : 0),
            playSeconds: inc(attempt.durationSec),
          },
          games: {
            [attempt.game]: {
              attempts: inc(1),
              wins: inc(attempt.success ? 1 : 0),
              playSeconds: inc(attempt.durationSec),
              lastPlayedAt: FieldValue.serverTimestamp(),
            },
          },
          ...(newBest
            ? { bests: { [bestKey]: { ...logic.bestRecord(attempt.game, attempt), at: Timestamp.fromDate(now) } } }
            : {}),
        },
        { merge: true },
      );

      if (sessionSnap?.exists) {
        tx.set(
          sessionRef,
          { lastSeenAt: FieldValue.serverTimestamp(), attempts: inc(1), wins: inc(attempt.success ? 1 : 0) },
          { merge: true },
        );
      }
      return { duplicate: false, streak: logic.effectiveStreak(streak, today), newBest };
    });

    res.status(result.duplicate ? 200 : 201).json({ ok: true, id: attempt.id, ...result });
  });

  // 4. Evento libre: cualquier cosa que valga la pena registrar (nivel elegido, abandono, etc.).
  router.post('/events', async (req, res) => {
    const parsed = logic.parseEvent(req.body);
    if (parsed.error) return res.status(400).json({ ok: false, message: parsed.error });
    const ref = await userRef(req)
      .collection('events')
      .add({ ...parsed.value, at: FieldValue.serverTimestamp() });
    res.status(201).json({ ok: true, id: ref.id });
  });

  // 5. Resumen para el perfil y el inicio: racha, contadores, mejores marcas y los últimos 60 intentos
  //    (el perfil los filtra por juego sin volver a pedirlos y muestra 10).
  router.get('/summary', async (req, res) => {
    const today = logic.dayKey(clock(), timezone);
    const [userSnap, recentSnap] = await Promise.all([
      userRef(req).get(),
      userRef(req).collection('attempts').orderBy('at', 'desc').limit(60).get(),
    ]);
    const data = userSnap.exists ? userSnap.data() : {};

    const games = {};
    for (const [name, value] of Object.entries(data.games || {})) {
      games[name] = {
        attempts: value.attempts || 0,
        wins: value.wins || 0,
        playSeconds: Math.round(value.playSeconds || 0),
        lastPlayedAt: toIso(value.lastPlayedAt),
      };
    }
    const bests = {};
    for (const [name, value] of Object.entries(data.bests || {})) bests[name] = { ...value, at: toIso(value.at) };

    res.json({
      ok: true,
      streak: logic.effectiveStreak(data.streak, today),
      totals: {
        sessions: data.totals?.sessions || 0,
        attempts: data.totals?.attempts || 0,
        wins: data.totals?.wins || 0,
        playSeconds: Math.round(data.totals?.playSeconds || 0),
      },
      games,
      bests,
      recent: recentSnap.docs.map((doc) => {
        const a = doc.data();
        return { id: doc.id, game: a.game, level: a.level, success: a.success, durationSec: a.durationSec, metrics: a.metrics || {}, at: toIso(a.at) };
      }),
    });
  });

  // Errores de Firestore u otros: respuesta JSON (sin tumbar el servidor).
  router.use((err, req, res, next) => {
    console.error('[actividad]', err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ ok: false, message: 'No se pudo guardar la actividad.' });
  });

  return router;
}

module.exports = createActivityRouter;
