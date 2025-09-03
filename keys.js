const dbm = require('./database-manager');

// Map-based cache for key lookups
const cache = new Map();

// Keys to preload on startup
const preloadList = ['resources', 'tradeNodes', 'kingdoms'];

async function load(key) {
  if (!cache.has(key)) {
    const data = await dbm.loadFile('keys', key);
    cache.set(key, data);
  }
  return cache.get(key);
}

async function preload() {
  await Promise.all(preloadList.map(load));
}

// Kick off preloading on module import
preload();

module.exports = {
  load,
  preload,
};
