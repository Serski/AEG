// Minimal env vars for requiring modules
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const harvestCmd = require('../commands/harvest');
const clientManager = require('../clientManager');
const char = require('../char');
const dbm = require('../database-manager');

function makeRand(values) {
  let i = 0;
  return () => values[i++];
}

test('performHarvest yield and loss logic', async (t) => {
  await t.test('GAS_GIANT yields min and max', () => {
    const now = Date.now();
    const charData = { fleet: { Harvester: 1, Aether: 1 }, inventory: {} };
    const submitted = { Harvester: 1, Aether: 1 };
    let rand = makeRand([0, 0]);
    let res = harvestCmd._performHarvest(charData, 'GAS_GIANT', { ...submitted }, now, rand);
    assert.equal(res.pccGained, 6); // 2 + 4
    assert.deepEqual(res.losses, {});

    const charData2 = { fleet: { Harvester: 1, Aether: 1 }, inventory: {} };
    rand = makeRand([0.999, 0.999]);
    res = harvestCmd._performHarvest(charData2, 'GAS_GIANT', { ...submitted }, now, rand);
    assert.equal(res.pccGained, 12); // 4 + 8
  });

  await t.test('STORM_ZONE yields and losses', () => {
    const now = Date.now();
    const charData = { fleet: { Harvester: 2, Aether: 1 }, inventory: {} };
    const submitted = { Harvester: 2, Aether: 1 };
    // yields 4,4,10, chance 15%, roll 0.1 triggers, lossCount 1, lose Harvester
    const rand = makeRand([0, 0, 0, 0.999, 0.1, 0, 0]);
    const res = harvestCmd._performHarvest(charData, 'STORM_ZONE', submitted, now, rand);
    assert.equal(res.pccGained, 18);
    assert.deepEqual(res.losses, { Harvester: 1 });
    assert.equal(charData.fleet.Harvester, 1);
    assert.equal(charData.inventory.PCC, 18);
  });
});

test('harvest command cooldown enforcement', async (t) => {
  const numericID = 'user1';
  const now = Date.now();
  const charData = { lastHarvestAt: now - 1000 };
  t.mock.method(clientManager, 'getHarvestSession', () => null);
  t.mock.method(char, 'findPlayerData', async () => [{}, charData]);

  let reply;
  const interaction = {
    deferReply: async () => {},
    editReply: async (msg) => { reply = msg; },
    user: { id: numericID }
  };

  await harvestCmd.execute(interaction);
  assert.equal(reply.content, 'You must wait 3 more minutes before harvesting again.');
});

test('harvest command normal flow', async (t) => {
  const numericID = 'player1';
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);

  const charData = { fleet: { Harvester: 1, Aether: 1 }, inventory: {}, lastHarvestAt: now - 4 * 60 * 1000 };
  t.mock.method(clientManager, 'getHarvestSession', () => null);
  t.mock.method(clientManager, 'setHarvestSession', () => {});
  t.mock.method(clientManager, 'clearHarvestSession', () => {});
  t.mock.method(char, 'findPlayerData', async () => [{}, charData]);
  t.mock.method(char, 'updatePlayer', async () => {});
  let logSaved;
  t.mock.method(dbm, 'saveFile', async (coll, key, data) => { logSaved = { coll, key, data }; });
  t.mock.method(Math, 'random', () => 0); // min yields

  const editCalls = [];
  const interaction = {
    deferReply: async () => {},
    editReply: async (msg) => { editCalls.push(msg); return msg; },
    fetchReply: async () => replyMessage,
    user: { id: numericID }
  };

  const replyMessage = {
    awaitMessageComponent: async () => regionInteraction
  };

  const regionInteraction = {
    user: { id: numericID },
    values: ['GAS_GIANT'],
    showModal: async () => {},
    awaitModalSubmit: async () => modalInteraction
  };

  const modalInteraction = {
    customId: 'harvestQuantities',
    user: { id: numericID },
    fields: {
      getTextInputValue: (id) => id === 'qty_Harvester' ? '1' : '1'
    },
    deferUpdate: async () => {}
  };

  await harvestCmd.execute(interaction);

  assert.equal(charData.inventory.PCC, 6);
  assert.equal(logSaved.coll, 'harvestLog');
  const finalEmbed = editCalls[editCalls.length - 1].embeds[0];
  assert.equal(finalEmbed.data.title, '🧪 PCC Harvest Result');
  const fields = finalEmbed.data.fields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {});
  assert.equal(fields.Region, 'Gas Giant Upper Atmosphere');
  assert.equal(fields['Ships Sent'], 'Harvester: 1\nAether: 1');
  assert.equal(fields['PCC Gained'], '6');
});

