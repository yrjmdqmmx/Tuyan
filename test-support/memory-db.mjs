// Deterministic, network-free Mongo subset for account lifecycle crash/race tests.
export function matches(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((part) => matches(row, part));
    if (key === '$and') return expected.every((part) => matches(row, part));
    const actual = key.split('.').reduce((value, part) => value?.[part], row);
    if (expected === null) return actual == null;
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      return Object.entries(expected).every(([op, value]) => {
        if (op === '$in') return value.some((v) => v == null ? actual == null : String(v) === String(actual));
        if (op === '$exists') return value === (actual !== undefined);
        if (op === '$lte') return actual <= value;
        if (op === '$lt') return actual < value;
        if (op === '$gt') return actual > value;
        if (op === '$gte') return actual >= value;
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
      const assertUnique = (candidate, previous) => {
        for (const index of [{ key: { _id: 1 }, unique: true }, ...indexes.filter(index => index.unique)]) {
          if (index.partialFilterExpression && !matches(candidate, index.partialFilterExpression)) continue;
          if (rows.some(row => row !== previous && (!index.partialFilterExpression || matches(row, index.partialFilterExpression)) && Object.keys(index.key).every(key => row[key] === candidate[key]))) throw Object.assign(new Error('duplicate'), { code: 11000 });
        }
      };
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
        async insertMany(values) { for (const value of values) await collection.insertOne(value); return { insertedCount: values.length }; },
        async findOneAndUpdate(query, change, options = {}) {
          const before = await collection.findOne(query);
          const result = await collection.updateOne(query, change, options);
          if (!result.modifiedCount) return null;
          return options.returnDocument === 'after' ? await collection.findOne({ _id: before?._id || query._id }) : before;
        },
        async findOne(query) { return structuredClone(rows.find((row) => matches(row, query)) || null); },
        async insertOne(row) { assertUnique(row); rows.push(structuredClone(row)); return { insertedId: row._id }; },
        async updateOne(query, change, options = {}) {
          const previous = rows.find((r) => matches(r, query));
          const inserted = !previous;
          if (!previous && !options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          const row = previous ? structuredClone(previous) : Object.fromEntries(Object.entries(query).filter(([k, v]) => !k.startsWith('$') && typeof v !== 'object'));
          if (inserted) Object.assign(row, structuredClone(change.$setOnInsert || {}));
          Object.assign(row, structuredClone(change.$set || {}));
          for (const key of Object.keys(change.$unset || {})) delete row[key];
          for (const [key, value] of Object.entries(change.$push || {})) { row[key] ||= []; row[key].push(structuredClone(value)); }
          for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
          assertUnique(row, previous);
          if (inserted) rows.push(row);
          else { for (const key of Object.keys(previous)) delete previous[key]; Object.assign(previous, row); }
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
