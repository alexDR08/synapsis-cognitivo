// Firestore en memoria, SOLO para pruebas automáticas (sin internet ni cuenta de Firebase).
// Imita lo que usa el backend: colecciones, documentos, set con merge, FieldValue.increment,
// serverTimestamp, consultas orderBy/limit y transacciones (lecturas antes que escrituras).
const { Timestamp } = require('firebase-admin/firestore');

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && v.constructor === Object;

function resolve(value, previous) {
  const kind = value && value.constructor && value.constructor.name;
  if (kind === 'NumericIncrementTransform') return (typeof previous === 'number' ? previous : 0) + value.operand;
  if (kind === 'ServerTimestampTransform') return Timestamp.now();
  if (isPlain(value)) return merge(isPlain(previous) ? previous : {}, value);
  return value;
}

function merge(previous, data) {
  const out = { ...previous };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    out[key] = resolve(value, previous[key]);
  }
  return out;
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

class FakeFirestore {
  constructor() {
    this.docs = new Map(); // ruta -> datos
    this.lock = Promise.resolve();
  }

  collection(path) {
    return new FakeCollection(this, path);
  }

  snapshot(path) {
    const data = this.docs.get(path);
    const id = path.split('/').pop();
    return {
      id,
      exists: data !== undefined,
      ref: new FakeDoc(this, path),
      data: () => (data === undefined ? undefined : structuredCopyKeepingTimestamps(data)),
      get: (field) => (data === undefined ? undefined : getPath(data, field)),
    };
  }

  write(path, data, merge_) {
    const previous = this.docs.get(path);
    this.docs.set(path, merge_ ? merge(previous || {}, data) : merge({}, data));
  }

  // Las transacciones se ejecutan una detrás de otra (aislamiento simple).
  runTransaction(fn) {
    const run = this.lock.then(async () => {
      const tx = new FakeTransaction(this);
      const result = await fn(tx);
      tx.writes.forEach(([path, data, opts]) => this.write(path, data, !!(opts && opts.merge)));
      return result;
    });
    this.lock = run.catch(() => {});
    return run;
  }
}

function structuredCopyKeepingTimestamps(value) {
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map(structuredCopyKeepingTimestamps);
  if (isPlain(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, structuredCopyKeepingTimestamps(v)]));
  return value;
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
    this.writes = [];
  }

  async get(ref) {
    if (this.writes.length) throw new Error('Firestore transactions require all reads to be executed before all writes.');
    return this.db.snapshot(ref.path);
  }

  set(ref, data, opts) {
    this.writes.push([ref.path, data, opts]);
    return this;
  }
}

class FakeDoc {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split('/').pop();
  }

  collection(name) {
    return new FakeCollection(this.db, `${this.path}/${name}`);
  }

  async get() {
    return this.db.snapshot(this.path);
  }

  async set(data, opts) {
    this.db.write(this.path, data, !!(opts && opts.merge));
  }

  async delete() {
    this.db.docs.delete(this.path);
  }
}

class FakeCollection {
  constructor(db, path, order = null, max = Infinity) {
    this.db = db;
    this.path = path;
    this.order = order;
    this.max = max;
  }

  doc(id = Math.random().toString(36).slice(2, 12)) {
    return new FakeDoc(this.db, `${this.path}/${id}`);
  }

  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  orderBy(field, direction = 'asc') {
    return new FakeCollection(this.db, this.path, { field, direction }, this.max);
  }

  limit(n) {
    return new FakeCollection(this.db, this.path, this.order, n);
  }

  async get() {
    const depth = this.path.split('/').length + 1;
    let paths = [...this.db.docs.keys()].filter((p) => p.startsWith(`${this.path}/`) && p.split('/').length === depth);
    if (this.order) {
      const { field, direction } = this.order;
      const key = (p) => {
        const v = getPath(this.db.docs.get(p), field);
        return v instanceof Timestamp ? v.toMillis() : v;
      };
      paths.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (direction === 'desc' ? -1 : 1));
    }
    paths = paths.slice(0, this.max);
    const docs = paths.map((p) => this.db.snapshot(p));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

module.exports = { FakeFirestore };
