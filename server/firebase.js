// Conexión a Firestore (Firebase) con el SDK de administrador.
// El navegador NUNCA habla con Firestore: solo este servidor, con la cuenta de servicio.
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ROOT = path.resolve(__dirname, '..');
let state; // undefined = aún no se intentó conectar

function readServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    // Acepta el JSON tal cual o codificado en base64 (útil en hostings)
    const text = inline.trim().startsWith('{') ? inline : Buffer.from(inline, 'base64').toString('utf8');
    return JSON.parse(text);
  }
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
  const full = path.isAbsolute(file) ? file : path.resolve(ROOT, file);
  if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8'));
  return null;
}

function connect() {
  try {
    const account = readServiceAccount();
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;

    if (!account && !emulator) {
      return { db: null, info: 'Firestore NO configurado (falta la cuenta de servicio): la actividad no se guardará.' };
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || account?.project_id || 'synapsis-local';
    const app = getApps()[0] || initializeApp(account ? { credential: cert(account), projectId } : { projectId });
    const db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* ya estaba configurado */
    }
    const where = emulator ? `emulador en ${emulator}` : 'Firebase';
    return { db, info: `Firestore listo (${where}, proyecto "${projectId}").` };
  } catch (err) {
    return { db: null, info: `Firestore NO disponible: ${err.message}` };
  }
}

function init() {
  if (state === undefined) state = connect();
  return state;
}

const getDb = () => init().db;
const describeFirestore = () => init().info;

module.exports = { getDb, describeFirestore };
