const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TOKEN = process.env.TOKEN || 'test';
process.env.CLIENT_ID = process.env.CLIENT_ID || 'test';
process.env.GUILD_ID = process.env.GUILD_ID || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db';

const dbm = require('../database-manager');
const shipUtils = require('../shipUtils');
const shipCatalog = require('../jsonStorage/shipCatalog.json');

test('shipUtils exposes catalog stats for KZ90', async (t) => {
  t.mock.method(dbm, 'loadCollection', async (collectionName) => {
    if (collectionName === 'shipCatalog') {
      return shipCatalog;
    }
    return {};
  });

  const stats = await shipUtils.getShipStats('KZ90');
  assert.deepStrictEqual(stats, shipCatalog['KZ90']);
});
