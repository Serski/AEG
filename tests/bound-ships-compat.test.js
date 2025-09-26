const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TOKEN = process.env.TOKEN || 'test';
process.env.CLIENT_ID = process.env.CLIENT_ID || 'test';
process.env.GUILD_ID = process.env.GUILD_ID || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db';

const shopCharUtils = require('../shared/shop-char-utils');
const dbm = require('../database-manager');

test('findPlayerData supplies default boundShips for existing characters', async (t) => {
  shopCharUtils.charCache.clear();
  t.mock.method(dbm, 'loadFile', async () => ({ name: 'Existing Player' }));

  const [id, charData] = await shopCharUtils.findPlayerData('12345');
  assert.equal(id, '12345');
  assert.deepEqual(charData.boundShips, {});

  // Cached call should retain the boundShips field
  const [cachedId, cachedData] = await shopCharUtils.findPlayerData('12345');
  assert.equal(cachedId, '12345');
  assert.deepEqual(cachedData.boundShips, {});
});
