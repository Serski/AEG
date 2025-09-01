const dbm = require('./database-manager');
const fs = require('fs');
const path = require('path');

async function initShipCatalog() {
  const catalogPath = path.join(__dirname, 'jsonStorage', 'shipCatalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  await dbm.saveCollection('shipCatalog', catalog);
  if (process.env.DEBUG) console.log('shipCatalog saved to DB');
}

initShipCatalog().catch(console.error);
