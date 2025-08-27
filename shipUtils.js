const dbm = require('./database-manager');

function loadShipCatalog() {
  return dbm.loadCollection('shipCatalog');
}

async function getShipStats(shipName) {
  const catalog = await loadShipCatalog();
  return catalog[shipName] || null;
}

async function calculateFleetPower(fleet = {}) {
  const catalog = await loadShipCatalog();
  const totals = { attack: 0, defense: 0, speed: 0, hp: 0 };
  for (const [shipName, count] of Object.entries(fleet)) {
    const stats = catalog[shipName];
    if (stats && count > 0) {
      totals.attack += stats.attack * count;
      totals.defense += stats.defense * count;
      totals.speed += stats.speed * count;
      totals.hp += stats.hp * count;
    }
  }
  return totals;
}

module.exports = { loadShipCatalog, getShipStats, calculateFleetPower };
