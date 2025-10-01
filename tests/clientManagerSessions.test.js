// Minimal env vars for requiring modules
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const clientManager = require('../clientManager');

const FIVE_MINUTES = 5 * 60 * 1000;
const FOUR_MINUTES = 4 * 60 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;

const SESSION_TYPES = [
  { name: 'raid', set: 'setRaidSession', get: 'getRaidSession', clear: 'clearRaidSession', store: 'raidSessions' },
  { name: 'mine', set: 'setMineSession', get: 'getMineSession', clear: 'clearMineSession', store: 'mineSessions' },
  { name: 'harvest', set: 'setHarvestSession', get: 'getHarvestSession', clear: 'clearHarvestSession', store: 'harvestSessions' },
  { name: 'trade', set: 'setTradeSession', get: 'getTradeSession', clear: 'clearTradeSession', store: 'tradeSessions' },
  { name: 'explore', set: 'setExploreSession', get: 'getExploreSession', clear: 'clearExploreSession', store: 'exploreSessions' }
];

test('session helpers share lifecycle semantics', async (t) => {
  for (const type of SESSION_TYPES) {
    await t.test(`${type.name} session lifecycle`, async (t) => {
      const userId = `${type.name}-user`;
      const payload = { value: type.name };
      let now = 1_000_000;
      t.mock.method(Date, 'now', () => now);

      clientManager[type.clear](userId);
      clientManager[type.set](userId, payload);

      const expected = { ...payload, expiresAt: now + FIVE_MINUTES };
      assert.deepEqual(clientManager[type.get](userId), expected);

      now += FOUR_MINUTES;
      assert.deepEqual(clientManager[type.get](userId), expected);

      now += TWO_MINUTES;
      assert.equal(clientManager[type.get](userId), null);
      assert.equal(clientManager[type.store].has(userId), false);

      clientManager[type.set](userId, payload);
      clientManager[type.clear](userId);
      assert.equal(clientManager[type.get](userId), null);

      t.mock.restoreAll();
    });
  }
});

