const fs = require('fs');
const path = require('path');
const config = require('./config');

let pgClient = null;
let usingPg = false;
let pgReady = Promise.resolve();

try {
  const { Client } = require('pg');
  if (config.databaseUrl) {
    pgClient = new Client({ connectionString: config.databaseUrl });
    pgReady = pgClient
      .connect()
      .then(() => {
        usingPg = true;
      })
      .catch((err) => {
        console.error('PostgreSQL connection error, falling back to JSON storage:', err);
        usingPg = false;
      });
  }
} catch (err) {
  console.error('pg module not installed, falling back to JSON storage:', err);
}

const storageDir = path.join(__dirname, 'jsonStorage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
}

function formatTable(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

async function ensureTable(table) {
  await pgReady;
  if (!usingPg) return;
  await pgClient.query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB)`);
}

async function saveCollection(collectionName, data) {
  await pgReady;
  if (usingPg) {
    const table = formatTable(collectionName);
    await ensureTable(table);
    await pgClient.query('BEGIN');
    await pgClient.query(`DELETE FROM ${table}`);
    for (const [id, value] of Object.entries(data)) {
      await pgClient.query(`INSERT INTO ${table} (id, data) VALUES ($1, $2)`, [id, value]);
    }
    await pgClient.query('COMMIT');
  } else {
    const filePath = path.join(storageDir, `${collectionName}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}

async function loadCollection(collectionName) {
  await pgReady;
  if (usingPg) {
    const table = formatTable(collectionName);
    await ensureTable(table);
    const res = await pgClient.query(`SELECT id, data FROM ${table}`);
    const data = {};
    for (const row of res.rows) {
      data[row.id] = row.data;
    }
    return data;
  } else {
    const filePath = path.join(storageDir, `${collectionName}.json`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
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
  if (usingPg) {
    await pgReady;
    const table = formatTable(collectionName);
    await ensureTable(table);
    await pgClient.query(
      `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [docId, data]
    );
  } else {
    const collectionData = await loadCollection(collectionName);
    collectionData[docId] = data;
    await saveCollection(collectionName, collectionData);
  }
}

async function loadFile(collectionName, docId) {
  if (usingPg) {
    await pgReady;
    const table = formatTable(collectionName);
    await ensureTable(table);
    const res = await pgClient.query(`SELECT data FROM ${table} WHERE id = $1`, [docId]);
    return res.rows[0] ? res.rows[0].data : undefined;
  } else {
    const collectionData = await loadCollection(collectionName);
    return collectionData.hasOwnProperty(docId) ? collectionData[docId] : undefined;
  }
}

async function docDelete(collectionName, docName) {
  if (usingPg) {
    await pgReady;
    const table = formatTable(collectionName);
    await ensureTable(table);
    await pgClient.query(`DELETE FROM ${table} WHERE id = $1`, [docName]);
  } else {
    const collectionData = await loadCollection(collectionName);
    if (collectionData.hasOwnProperty(docName)) {
      delete collectionData[docName];
      await saveCollection(collectionName, collectionData);
    }
  }
}

async function fieldDelete(collectionName, docName, deleteField) {
  if (usingPg) {
    await pgReady;
    const table = formatTable(collectionName);
    await ensureTable(table);
    await pgClient.query(`UPDATE ${table} SET data = data - $2 WHERE id = $1`, [docName, deleteField]);
  } else {
    const collectionData = await loadCollection(collectionName);
    if (
      collectionData.hasOwnProperty(docName) &&
      collectionData[docName].hasOwnProperty(deleteField)
    ) {
      delete collectionData[docName][deleteField];
      await saveCollection(collectionName, collectionData);
    }
  }
}

async function logData() {
  if (usingPg) {
    await pgReady;
    const res = await pgClient.query(
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
    console.log(`Log data for ${dateString} saved successfully.`);
  } else {
    const files = await fs.promises.readdir(storageDir);
    const collections = files
      .filter((file) => file.endsWith('.json') && file !== 'logs.json')
      .map((file) => path.basename(file, '.json'));
    const logDataObj = {};
    for (const collectionName of collections) {
      logDataObj[collectionName] = await loadCollection(collectionName);
    }
    const dateString = new Date().toISOString().split('T')[0];
    await saveFile('logs', dateString, logDataObj);
    console.log(`Log data for ${dateString} saved successfully.`);
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
};

