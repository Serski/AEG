const dbm = require('../database-manager');

// Utilities shared between char.js and shop.js
// Avoid importing char.js or shop.js here to prevent circular dependencies.

// --- Shop cache and item lookup ---
let shopCache = null;
let itemNameIndex = {};

function buildItemNameIndex() {
  itemNameIndex = {};
  if (shopCache) {
    for (const key of Object.keys(shopCache)) {
      itemNameIndex[key.toLowerCase()] = key;
    }
  }
}

async function getShopData() {
  if (!shopCache) {
    shopCache = await dbm.loadCollection('shop');
    buildItemNameIndex();
  }
  return shopCache;
}

async function refreshShopCache() {
  shopCache = await dbm.loadCollection('shop');
  buildItemNameIndex();
  return shopCache;
}

function clearShopCache() {
  shopCache = null;
  itemNameIndex = {};
}

function findItemName(itemName) {
  return itemNameIndex[itemName.toLowerCase()] || 'ERROR';
}

// --- Character cache and persistence ---
const charCache = new Map();

async function findPlayerData(id) {
  const player = String(id);
  if (charCache.has(player)) {
    return [player, charCache.get(player)];
  }
  const charData = await dbm.loadFile('characters', player);
  if (!charData) {
    return [false, false];
  }
  charCache.set(player, charData);
  return [player, charData];
}

async function updatePlayer(id, data) {
  const player = String(id);
  await dbm.saveFile('characters', player, data);
  charCache.set(player, data);
}

module.exports = {
  getShopData,
  refreshShopCache,
  clearShopCache,
  findItemName,
  charCache,
  findPlayerData,
  updatePlayer,
};

