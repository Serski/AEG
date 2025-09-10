const fs = require('fs');
const path = require('path');
const config = require('./config');

let Pool;
try {
  ({ Pool } = require('pg'));
} catch (err) {
  console.error('pg module not installed, falling back to JSON storage:', err);
}

let pool = null;
let usingPg = false;

async function pgBoot() {
  if (pool || !config.databaseUrl || !Pool) return;
  const pgOptions = {
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
  if (process.env.AEG_PG_KEEPALIVE === 'true') {
    pgOptions.keepAlive = true;
    pgOptions.keepAliveInitialDelayMillis = 10000;
  }
  pool = new Pool(pgOptions);
  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await pool.query('SELECT 1');
      usingPg = true;
      return;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  usingPg = false;
}

const TRANSIENT = /(ECONNRESET|terminat|57P01|57P02|57P03|connection error)/i;

async function runWithRetry(op, max = 2) {
  let a = 0;
  while (true) {
    try {
      return await op();
    } catch (e) {
      if (++a > max || !TRANSIENT.test(String(e.message))) throw e;
      await new Promise((r) => setTimeout(r, 500 * a));
    }
  }
}

async function withClient(fn) {
  const c = await pool.connect();
  try {
    await c.query("SET statement_timeout = '30s'").catch(() => {});
    return await fn(c);
  } finally {
    c.release();
  }
}

async function withTx(fn) {
  return withClient(async (c) => {
    await c.query('BEGIN');
    try {
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      try {
        await c.query('ROLLBACK');
      } catch {}
      throw e;
    }
  });
}

async function ping() {
  return runWithRetry(() => withClient((c) => c.query('SELECT 1')));
}

pgBoot().catch(console.error);

const storageDir = path.join(__dirname, 'jsonStorage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
}

// Simple in-memory cache to avoid repeatedly reading the same JSON files
// Structure: { [collectionName]: Map<docId, data> }
const collectionCache = new Map();
const fullyLoadedCollections = new Set();

function getCache(collectionName) {
  if (!collectionCache.has(collectionName)) {
    collectionCache.set(collectionName, new Map());
  }
  return collectionCache.get(collectionName);
}

function formatTable(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

// Track which tables have already been ensured to avoid repeated round-trips
const ensuredTables = new Set();

async function ensureTable(table) {
  await pgBoot();
  if (!usingPg) return;
  if (ensuredTables.has(table)) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB)`
  );
  ensuredTables.add(table);
}

async function updateCollectionRecord(collectionName, id, data) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    await pool.query(
      `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, data]
    );
    getCache(collectionName).set(id, data);
  } else {
    const dirPath = path.join(storageDir, collectionName);
    await fs.promises.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${id}.json`);
    const cache = getCache(collectionName);
    const cached = cache.get(id);
    if (cached && JSON.stringify(cached) === JSON.stringify(data)) return;
    if (!cached) {
      try {
        const existing = await fs.promises.readFile(filePath, 'utf8');
        if (existing && JSON.stringify(JSON.parse(existing)) === JSON.stringify(data)) {
          cache.set(id, data);
          return;
        }
      } catch {}
    }
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    cache.set(id, data);
  }
}

async function removeCollectionRecord(collectionName, id) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    getCache(collectionName).delete(id);
  } else {
    const dirPath = path.join(storageDir, collectionName);
    const filePath = path.join(dirPath, `${id}.json`);
    await fs.promises.unlink(filePath).catch(() => {});
    getCache(collectionName).delete(id);
  }
}

async function saveCollection(collectionName, data) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    const cache = getCache(collectionName);
    let existing;
    if (fullyLoadedCollections.has(collectionName)) {
      existing = new Set(cache.keys());
    } else {
      const res = await pool.query(`SELECT id FROM ${table}`);
      existing = new Set(res.rows.map((r) => r.id));
    }
    for (const [id, value] of Object.entries(data)) {
      await updateCollectionRecord(collectionName, id, value);
      existing.delete(id);
    }
    for (const id of existing) {
      await removeCollectionRecord(collectionName, id);
    }
    fullyLoadedCollections.add(collectionName);
  } else {
    const dirPath = path.join(storageDir, collectionName);
    const useDir = fs.existsSync(dirPath);
    const cache = getCache(collectionName);
    if (useDir) {
      const existing = new Set(
        await fs.promises
          .readdir(dirPath)
          .then((files) => files.filter((f) => f.endsWith('.json')).map((f) => path.basename(f, '.json')))
      );
      for (const [id, value] of Object.entries(data)) {
        await updateCollectionRecord(collectionName, id, value);
        existing.delete(id);
      }
      for (const id of existing) {
        await removeCollectionRecord(collectionName, id);
      }
      fullyLoadedCollections.add(collectionName);
    } else {
      const filePath = path.join(storageDir, `${collectionName}.json`);
      let existingData = {};
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        existingData = JSON.parse(content);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      let changed = false;
      for (const [id, value] of Object.entries(data)) {
        if (!existingData.hasOwnProperty(id) || JSON.stringify(existingData[id]) !== JSON.stringify(value)) {
          existingData[id] = value;
          changed = true;
        }
        cache.set(id, value);
      }
      for (const id of Object.keys(existingData)) {
        if (!data.hasOwnProperty(id)) {
          delete existingData[id];
          cache.delete(id);
          changed = true;
        }
      }
      if (changed) {
        await fs.promises.writeFile(filePath, JSON.stringify(existingData, null, 2));
      }
      fullyLoadedCollections.add(collectionName);
    }
  }
}

async function loadCollection(collectionName, forceRefresh = false) {
  await pgBoot();
  const cache = getCache(collectionName);
  if (!forceRefresh && fullyLoadedCollections.has(collectionName)) {
    return Object.fromEntries(cache);
  }
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    const res = await pool.query(`SELECT id, data FROM ${table}`);
    const data = {};
    cache.clear();
    for (const row of res.rows) {
      data[row.id] = row.data;
      cache.set(row.id, row.data);
    }
    fullyLoadedCollections.add(collectionName);
    return data;
  } else {
    const dirPath = path.join(storageDir, collectionName);
    try {
      const stat = await fs.promises.stat(dirPath);
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(dirPath);
        const data = {};
        cache.clear();
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const id = path.basename(file, '.json');
          const content = await fs.promises.readFile(path.join(dirPath, file), 'utf8');
          const parsed = JSON.parse(content);
          data[id] = parsed;
          cache.set(id, parsed);
        }
        fullyLoadedCollections.add(collectionName);
        return data;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    const filePath = path.join(storageDir, `${collectionName}.json`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      cache.clear();
      for (const [id, value] of Object.entries(parsed)) {
        cache.set(id, value);
      }
      fullyLoadedCollections.add(collectionName);
      return parsed;
    } catch (err) {
      if (err.code === 'ENOENT') {
        cache.clear();
        fullyLoadedCollections.add(collectionName);
        return {};
      }
      throw err;
    }
  }
}

async function loadCollectionFileNames(collectionName) {
  const data = await loadCollection(collectionName);
  const names = {};
  for (const id of Object.keys(data)) {
    names[id] = id;
  }
  return names;
}

async function saveFile(collectionName, docId, data) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    await pool.query(
      `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [docId, data]
    );
    const cache = getCache(collectionName);
    cache.set(docId, data);
  } else {
    const dirPath = path.join(storageDir, collectionName);
    await fs.promises.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${docId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    const cache = getCache(collectionName);
    cache.set(docId, data);
  }
}

async function loadFile(collectionName, docId, forceRefresh = false) {
  const cache = getCache(collectionName);
  if (!forceRefresh && cache.has(docId)) return cache.get(docId);
  if (!forceRefresh && fullyLoadedCollections.has(collectionName)) return undefined;
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    const res = await pool.query(`SELECT data FROM ${table} WHERE id = $1`, [docId]);
    const row = res.rows[0];
    if (row) {
      cache.set(docId, row.data);
      return row.data;
    } else {
      cache.delete(docId);
      return undefined;
    }
  } else {
    const dirPath = path.join(storageDir, collectionName);
    const filePath = path.join(dirPath, `${docId}.json`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      cache.set(docId, data);
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') {
        const collectionPath = path.join(storageDir, `${collectionName}.json`);
        try {
          const content = await fs.promises.readFile(collectionPath, 'utf8');
          const parsed = JSON.parse(content);
          if (parsed.hasOwnProperty(docId)) {
            cache.set(docId, parsed[docId]);
            return parsed[docId];
          }
          cache.delete(docId);
          return undefined;
        } catch (err2) {
          if (err2.code === 'ENOENT') return undefined;
          throw err2;
        }
      }
      throw err;
    }
  }
}

async function docDelete(collectionName, docName) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [docName]);
    getCache(collectionName).delete(docName);
  } else {
    const dirPath = path.join(storageDir, collectionName);
    const filePath = path.join(dirPath, `${docName}.json`);
    try {
      await fs.promises.unlink(filePath);
      getCache(collectionName).delete(docName);
    } catch (err) {
      if (err.code === 'ENOENT') {
        const collectionData = await loadCollection(collectionName);
        if (collectionData.hasOwnProperty(docName)) {
          delete collectionData[docName];
          await saveCollection(collectionName, collectionData);
        }
      } else {
        throw err;
      }
    }
  }
}

async function fieldDelete(collectionName, docName, deleteField) {
  await pgBoot();
  if (usingPg) {
    const table = formatTable(collectionName);
    if (!ensuredTables.has(table)) await ensureTable(table);
    await pool.query(`UPDATE ${table} SET data = data - $2 WHERE id = $1`, [docName, deleteField]);
    const cache = getCache(collectionName);
    if (cache.has(docName)) {
      const doc = cache.get(docName);
      delete doc[deleteField];
      cache.set(docName, doc);
    }
  } else {
    const doc = await loadFile(collectionName, docName);
    if (doc && Object.prototype.hasOwnProperty.call(doc, deleteField)) {
      delete doc[deleteField];
      await saveFile(collectionName, docName, doc);
    }
  }
}

async function logData() {
  await pgBoot();
  if (usingPg) {
    const res = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public'`
    );
    const tables = res.rows
      .map((r) => r.tablename)
      .filter((name) => name !== 'logs');
    const logData = {};
    for (const table of tables) {
      logData[table] = await loadCollection(table);
    }
    const dateString = new Date().toISOString().split('T')[0];
    await saveFile('logs', dateString, logData);
    if (process.env.DEBUG) console.log(`Log data for ${dateString} saved successfully.`);
  } else {
    const files = await fs.promises.readdir(storageDir);
    const collections = [];
    for (const file of files) {
      const full = path.join(storageDir, file);
      const stat = await fs.promises.stat(full);
      if (stat.isDirectory()) {
        collections.push(file);
      } else if (file.endsWith('.json') && file !== 'logs.json') {
        collections.push(path.basename(file, '.json'));
      }
    }
    const logDataObj = {};
    for (const collectionName of collections) {
      logDataObj[collectionName] = await loadCollection(collectionName);
    }
    const dateString = new Date().toISOString().split('T')[0];
    await saveFile('logs', dateString, logDataObj);
    if (process.env.DEBUG) console.log(`Log data for ${dateString} saved successfully.`);
  }
}

module.exports = {
  saveCollection,
  loadCollection,
  loadCollectionFileNames,
  saveFile,
  loadFile,
  docDelete,
  fieldDelete,
  logData,
  updateCollectionRecord,
  removeCollectionRecord,
  ping,
};

