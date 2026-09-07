// Deterministic, network-free Mongo subset for account lifecycle crash/race tests.
export function matches(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((part) => matches(row, part));
    if (key === '$and') return expected.every((part) => matches(row, part));
    const actual = row[key];
    if (expected === null) return actual == null;
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      return Object.entries(expected).every(([op, value]) => {
        if (op === '$in') return value.some((v) => v == null ? actual == null : String(v) === String(actual));
        if (op === '$exists') return value === (actual !== undefined);
        if (op === '$lte') return actual <= value;
        if (op === '$lt') return actual < value;
        if (op === '$gt') return actual > value;
        if (op === '$ne') return actual !== value;
        throw new Error(`Unsupported test query: ${op}`);
      });
    }
    return actual instanceof Date && expected instanceof Date ? +actual === +expected : actual === expected;
  });
}
export function memoryDb(seed = {}) {
  const collections = new Map();
  return {
    collection(name) {
      if (collections.has(name)) return collections.get(name);
      const rows = structuredClone(seed[name] || []);
      const indexes = [];
      const collection = {
        rows, indexes,
        async createIndex(key, options) { indexes.push({ key, ...options }); },
        find(query = {}) {
          let selected = rows.filter((row) => matches(row, query));
          return {
            sort(order) { const [key, direction] = Object.entries(order)[0]; selected.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * direction); return this; },
            limit(count) { selected = selected.slice(0, count); return this; },
            async toArray() { return structuredClone(selected); },
          };
        },
        async findOne(query) { return structuredClone(rows.find((row) => matches(row, query)) || null); },
        async insertOne(row) { if (rows.some((v) => v._id === row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 }); rows.push(structuredClone(row)); return { insertedId: row._id }; },
        async updateOne(query, change, options = {}) {
          let row = rows.find((r) => matches(r, query));
          const inserted = !row;
          if (!row && !options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          if (!row) { row = Object.fromEntries(Object.entries(query).filter(([k, v]) => !k.startsWith('$') && typeof v !== 'object')); await collection.insertOne(row); row = rows.at(-1); }
          if (inserted) Object.assign(row, structuredClone(change.$setOnInsert || {}));
          Object.assign(row, structuredClone(change.$set || {}));
          for (const key of Object.keys(change.$unset || {})) delete row[key];
          for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
          return { matchedCount: inserted ? 0 : 1, modifiedCount: 1 };
        },
        async updateMany(query, change) { const selected = rows.filter((row) => matches(row, query)); for (const row of selected) await collection.updateOne({ _id: row._id }, change); return { modifiedCount: selected.length }; },
        async deleteMany(query) { let count = 0; for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], query)) { rows.splice(i, 1); count++; } return { deletedCount: count }; },
        async deleteOne(query) { const index = rows.findIndex((row) => matches(row, query)); if (index < 0) return { deletedCount: 0 }; rows.splice(index, 1); return { deletedCount: 1 }; },
        async countDocuments(query) { return rows.filter((row) => matches(row, query)).length; },
      };
      collections.set(name, collection);
      return collection;
    },
  };
}
