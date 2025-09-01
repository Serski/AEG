const dbm = require('../database-manager');
const fs = require('fs');
const path = require('path');

async function run() {
  async function seedCollectionIfEmpty(collectionName, jsonRelPath) {
    const existing = await dbm.loadCollection(collectionName);
    if (Object.keys(existing).length === 0) {
      const filePath = path.join(__dirname, '..', 'jsonStorage', jsonRelPath);
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      await dbm.saveCollection(collectionName, data);
      if (process.env.DEBUG) console.log(`[seed] ${collectionName}: seeded.`);
    } else {
      if (process.env.DEBUG) console.log(`[seed] ${collectionName}: skipped, already has data.`);
    }
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
