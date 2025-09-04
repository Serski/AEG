// Minimal configuration so requiring project modules does not exit
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const char = require('../char');
const shop = require('../shop');
const dbm = require('../database-manager');
const addItemsCmd = require('../commands/charCommands/additemstoplayer');
const giveItemCmd = require('../commands/charCommands/giveitem');

test('item commands update caches correctly', async (t) => {
  await t.test('additemstoplayer updates player inventory and caches', async (t) => {
    // Reset caches and set up a transferrable item
    char.charCache = new Map();
    shop.shopCache = {
      Potion: { infoOptions: { 'Transferrable (Y/N)': 'Yes' } }
    };
    shop.buildItemNameIndex();

    const playerId = 'player1';
    const playerData = { inventory: {} };
    char.charCache.set(playerId, playerData);

    t.mock.method(dbm, 'saveFile', async () => {});
    t.mock.method(dbm, 'loadFile', async () => { throw new Error('loadFile should not be called'); });
    t.mock.method(dbm, 'loadCollection', async () => { throw new Error('loadCollection should not be called'); });

    let reply;
    const interaction = {
      deferReply: async () => {},
      editReply: async (msg) => { reply = msg; },
      options: {
        getUser: () => ({ id: playerId }),
        getString: () => 'Potion',
        getInteger: () => 2
      }
    };

    await addItemsCmd.execute(interaction);

    assert.equal(reply, `Gave 2 Potion to ${playerId}`);
    assert.strictEqual(char.charCache.get(playerId), playerData);
    assert.deepStrictEqual(playerData.inventory, { Potion: 2 });
    assert.deepStrictEqual(shop.shopCache, {
      Potion: { infoOptions: { 'Transferrable (Y/N)': 'Yes' } }
    });
  });

  await t.test('giveitemtoplayer transfers item and keeps caches consistent', async (t) => {
    // Reset caches and set up a transferrable item
    char.charCache = new Map();
    shop.shopCache = {
      Potion: { infoOptions: { 'Transferrable (Y/N)': 'Yes' } }
    };
    shop.buildItemNameIndex();

    const giver = 'giver';
    const receiver = 'receiver';
    const giverData = { inventory: { Potion: 5 } };
    const receiverData = { inventory: {} };
    char.charCache.set(giver, giverData);
    char.charCache.set(receiver, receiverData);

    t.mock.method(dbm, 'saveFile', async () => {});
    t.mock.method(dbm, 'loadFile', async () => { throw new Error('loadFile should not be called'); });
    t.mock.method(dbm, 'loadCollection', async () => { throw new Error('loadCollection should not be called'); });

    let reply;
    const interaction = {
      deferReply: async () => {},
      editReply: async (msg) => { reply = msg; },
      user: { id: giver },
      options: {
        getUser: () => ({ id: receiver }),
        getString: () => 'Potion',
        getInteger: () => 3
      }
    };

    await giveItemCmd.execute(interaction);

    assert.equal(reply, `Gave 3 Potion to ${receiver}`);
    assert.strictEqual(char.charCache.get(giver), giverData);
    assert.strictEqual(char.charCache.get(receiver), receiverData);
    assert.strictEqual(giverData.inventory.Potion, 2);
    assert.strictEqual(receiverData.inventory.Potion, 3);
    assert.deepStrictEqual(shop.shopCache, {
      Potion: { infoOptions: { 'Transferrable (Y/N)': 'Yes' } }
    });
  });
});

