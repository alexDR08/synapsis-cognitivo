const test = require('node:test');
const assert = require('node:assert/strict');
const { FakeFirestore } = require('./testing/fakeFirestore');
const createUserStore = require('./users');

test('crea, busca, actualiza y suma aciertos en Firestore', async () => {
  const users = createUserStore(() => new FakeFirestore());
  const db = new FakeFirestore();
  const store = createUserStore(() => db);

  assert.equal(await store.findByEmail('a@uvp.edu.mx'), null);
  const u = await store.create({ email: 'A@uvp.edu.mx', googleId: 'g1' });
  assert.equal(u.id, 'a@uvp.edu.mx');
  assert.equal((await store.findById(u.id)).googleId, 'g1');

  await store.update(u.id, { googleId: 'g2' });
  assert.equal((await store.findByEmail('a@uvp.edu.mx')).googleId, 'g2');

  assert.equal(await store.incrementScore(u.id), 1);
  assert.equal(await store.incrementScore(u.id), 2);
  assert.ok(users);
});
