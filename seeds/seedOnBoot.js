const dbm = require('../database-manager');
const fs = require('fs');
const path = require('path');

async function run() {
  async function seedCollectionIfEmpty(collectionName, jsonRelPath) {
    const existing = await dbm.loadCollection(collectionName);
    const filePath = path.join(__dirname, '..', 'jsonStorage', jsonRelPath);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (Object.keys(existing).length === 0) {
      await dbm.saveCollection(collectionName, data);
      if (process.env.DEBUG) console.log(`[seed] ${collectionName}: seeded.`);
      return;
    }

    let needsUpdate = false;
    for (const [key, value] of Object.entries(data)) {
      if (!existing.hasOwnProperty(key) || JSON.stringify(existing[key]) !== JSON.stringify(value)) {
        needsUpdate = true;
        break;
      }
    }

    if (!needsUpdate) {
      if (process.env.DEBUG) console.log(`[seed] ${collectionName}: up to date, skipped.`);
      return;
    }

    const merged = { ...existing, ...data };
    await dbm.saveCollection(collectionName, merged);
    if (process.env.DEBUG) console.log(`[seed] ${collectionName}: updated with new entries.`);
  }

  const ENABLED = process.env.SEED_ON_BOOT !== 'false';
  if (!ENABLED) {
    if (process.env.DEBUG) console.log('[seed] Disabled via SEED_ON_BOOT=false.');
    return;
  }

  await seedCollectionIfEmpty('shipCatalog', 'shipCatalog.json');
  await seedCollectionIfEmpty('raidTargets', 'raidTargets.json');
}

run().catch(err => {
  console.error('[seed] Failed:', err);
});
