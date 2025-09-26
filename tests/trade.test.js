// Minimal env vars for requiring modules
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const tradeCmd = require('../commands/trade');
const clientManager = require('../clientManager');
const char = require('../char');
const dbm = require('../database-manager');

function makeRand(values) {
  let i = 0;
  return () => values[i++];
}

test('performTrade earnings and loss logic', async (t) => {
  await t.test('SECTOR earnings min and max', () => {
    const now = Date.now();
    const charData = { fleet: {}, inventory: {}, balance: 0, boundShips: {} };
    const submitted = { Bridger: 1, Freighter: 1 };
    let rand = makeRand([0, 0, 0.5]);
    let res = tradeCmd._performTrade(charData, 'SECTOR', { ...submitted }, now, rand);
    assert.equal(res.earnings, 125); // 50 + floor(50*1.5)
    assert.equal(res.moneyLost, 0);

    const charData2 = { fleet: {}, inventory: {}, balance: 0, boundShips: {} };
    rand = makeRand([0.999, 0.999, 0.5]);
    res = tradeCmd._performTrade(charData2, 'SECTOR', { ...submitted }, now, rand);
    assert.equal(res.earnings, 250); // 100 + floor(100*1.5)
  });

  await t.test('DOMINION money loss and ship loss', () => {
    const now = Date.now();
    const charData = { fleet: { Bridger: 1, Freighter: 1 }, inventory: {}, balance: 0, boundShips: {} };
    const submitted = { Bridger: 1, Freighter: 1 };
    // earnings 150 + floor(150*1.5) = 375, money loss 75, ship loss 1 Bridger, compensation Horse
    const rand = makeRand([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const res = tradeCmd._performTrade(charData, 'DOMINION', submitted, now, rand);
    assert.equal(res.earnings, 375);
    assert.equal(res.moneyLost, 75);
    assert.deepEqual(res.losses, { Bridger: 1 });
    assert.equal(charData.fleet.Bridger, undefined);
    assert.equal(charData.fleet.Freighter, undefined);
    assert.equal(charData.boundShips.Bridger, undefined);
    assert.equal(charData.boundShips.Freighter, 1);
    assert.equal(charData.inventory.Horse, 1);
    assert.equal(charData.balance, 300);
    assert.equal(res.compensationItem, 'Horse');
  });
});

test('trade command cooldown enforcement', async (t) => {
  const numericID = 'user1';
  const now = Date.now();
  const charData = { lastTradeAt: now - 1000 };
  t.mock.method(clientManager, 'getTradeSession', () => null);
  t.mock.method(char, 'findPlayerData', async () => [{}, charData]);

  let reply;
  const interaction = {
    deferReply: async () => {},
    editReply: async (msg) => { reply = msg; },
    user: { id: numericID }
  };

  await tradeCmd.execute(interaction);
  assert.equal(reply.content, 'You must wait 24 hours and 0 minutes before trading again.');
});

test('trade command normal flow', async (t) => {
  const numericID = 'player1';
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);

  const charData = {
    fleet: { Bridger: 1, Freighter: 1 },
    inventory: {},
    balance: 0,
    boundShips: {},
    lastTradeAt: now - tradeCmd.COOLDOWN_MS - 60 * 1000
  };
  t.mock.method(clientManager, 'getTradeSession', () => null);
  t.mock.method(clientManager, 'setTradeSession', () => {});
  t.mock.method(clientManager, 'clearTradeSession', () => {});
  t.mock.method(clientManager, 'getEmoji', () => 'Gold');
  t.mock.method(char, 'findPlayerData', async () => [{}, charData]);
  t.mock.method(char, 'updatePlayer', async () => {});
  let logSaved;
  t.mock.method(dbm, 'saveFile', async (coll, key, data) => { logSaved = { coll, key, data }; });
  t.mock.method(Math, 'random', () => 0.99); // max earnings, no losses

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
    values: ['SECTOR'],
    showModal: async () => {},
    awaitModalSubmit: async () => modalInteraction
  };

  const modalInteraction = {
    customId: 'tradeQuantities',
    user: { id: numericID },
    fields: {
      getTextInputValue: (id) => id === 'qty_Bridger' ? '1' : '1'
    },
    deferUpdate: async () => {}
  };

  await tradeCmd.execute(interaction);

  assert.equal(charData.balance, 250);
  assert.deepEqual(charData.boundShips, { Bridger: 1, Freighter: 1 });
  assert.equal(logSaved.coll, 'tradeLog');
  const finalEmbed = editCalls[editCalls.length - 1].embeds[0];
  assert.equal(finalEmbed.data.title, '💰 Trade Result');
  const fields = finalEmbed.data.fields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {});
  assert.equal(fields.Region, 'Sector Trade');
  assert.equal(fields['Ships Sent'], 'Bridger: 1\nFreighter: 1');
  assert.equal(fields['Gold Earned'], 'Gold 250');
  assert.equal(fields['Gold Lost'], 'Gold 0');
});
