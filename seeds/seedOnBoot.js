const dbm = require('../database-manager');
const fs = require('fs');
const path = require('path');

async function run() {
  async function seedCollection(collectionName, jsonRelPath) {
    const filePath = path.join(__dirname, '..', 'jsonStorage', jsonRelPath);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    await dbm.saveCollection(collectionName, data);
    console.log(`[seed] ${collectionName}: saved to DB.`);
  }

  const ENABLED = process.env.SEED_ON_BOOT !== 'false';
  if (!ENABLED) {
    console.log('[seed] Disabled via SEED_ON_BOOT=false.');
    return;
  }

  await seedCollection('shipCatalog', 'shipCatalog.json');
  await seedCollection('raidTargets', 'raidTargets.json');
}

run().catch(err => {
  console.error('[seed] Failed:', err);
});
