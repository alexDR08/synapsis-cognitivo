// Usuarios en Firestore (colección "users"). El id del documento es el correo.
const COLLECTION = 'users';

function createUserStore(getDb) {
  const col = () => {
    const db = getDb();
    if (!db) throw new Error('Firestore no está configurado en el servidor (falta FIREBASE_SERVICE_ACCOUNT_JSON).');
    return db.collection(COLLECTION);
  };
  const toUser = (snap) => (snap.exists ? { id: snap.id, ...snap.data() } : null);
  const idFor = (email) => String(email).trim().toLowerCase();

  return {
    async findByEmail(email) {
      return toUser(await col().doc(idFor(email)).get());
    },
    async findById(id) {
      return toUser(await col().doc(String(id)).get());
    },
    async create({ email, password, googleId }) {
      const id = idFor(email);
      const data = { email: id, score: 0 };
      if (password) data.password = password;
      if (googleId) data.googleId = googleId;
      await col().doc(id).set(data);
      return { id, ...data };
    },
    async update(id, fields) {
      await col().doc(String(id)).set(fields, { merge: true });
    },
    async incrementScore(id) {
      const ref = col().doc(String(id));
      const db = getDb();
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const score = (snap.exists ? snap.data().score || 0 : 0) + 1;
        tx.set(ref, { score }, { merge: true });
        return score;
      });
    }
  };
}

module.exports = createUserStore;
