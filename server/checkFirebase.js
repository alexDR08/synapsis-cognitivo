// Comprueba que el servidor puede escribir y leer en tu Firestore:  npm run firebase:check
require('dotenv').config();
const { getDb, describeFirestore } = require('./firebase');

(async () => {
  console.log(describeFirestore());
  const db = getDb();
  if (!db) process.exit(1);

  const ref = db.collection('_healthcheck').doc('ping');
  try {
    await ref.set({ at: new Date().toISOString(), from: 'npm run firebase:check' });
    const snap = await ref.get();
    await ref.delete();
    console.log(snap.exists ? 'OK: se escribió y se leyó un documento de prueba en Firestore.' : 'Algo falló: el documento no se encontró.');
  } catch (err) {
    console.error('ERROR al hablar con Firestore:', err.message);
    console.error('Revisa que Firestore esté creado en la consola de Firebase y que la cuenta de servicio sea del mismo proyecto.');
    process.exit(1);
  }
})();
