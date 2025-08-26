const shipUtils = require('./shipUtils');
const dbm = require('./database-manager');

// Default tuning constants
const DEFAULT_WEIGHTS = {
  attack: 1,
  defense: 1,
  hp: 0.5,
  speed: 0.2,
  tier: 5,
};

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

async function loadRaidTargets() {
  return await dbm.loadCollection('raidTargets');
}

function rollPower(basePower, variancePercent = 0) {
  const variance = variancePercent;
  const delta = randomRange(-variance, variance);
  return basePower * (1 + delta);
}

async function calculateFleetPowerWeighted(fleet = {}, weights = DEFAULT_WEIGHTS) {
  const catalog = await shipUtils.loadShipCatalog();
  let totals = { attack: 0, defense: 0, speed: 0, hp: 0, tier: 0 };
  for (const [shipName, count] of Object.entries(fleet)) {
    const stats = catalog[shipName];
    if (stats && count > 0) {
      totals.attack += stats.attack * count;
      totals.defense += stats.defense * count;
      totals.speed += stats.speed * count;
      totals.hp += stats.hp * count;
      totals.tier += (stats.tier || 0) * count;
    }
  }
  const power =
    totals.attack * (weights.attack || 0) +
    totals.defense * (weights.defense || 0) +
    totals.hp * (weights.hp || 0) +
    totals.speed * (weights.speed || 0) +
    totals.tier * (weights.tier || 0);
  return power;
}

async function simulateBattle(fleet, target, weights = DEFAULT_WEIGHTS, variance = 0.1) {
  const basePlayerPower = await calculateFleetPowerWeighted(fleet, weights);
  const playerRoll = rollPower(basePlayerPower, variance);
  const enemyRoll = rollPower(target.enemyPower, variance);
  const rolls = { player: playerRoll, enemy: enemyRoll };

  const pressure = enemyRoll / Math.max(playerRoll, 1);
  const margin = (playerRoll - enemyRoll) / enemyRoll;

  let result = 'loss';
  if (playerRoll >= enemyRoll) {
    result = pressure > 0.8 ? 'pyrrhic' : 'win';
  }

  const catalog = await shipUtils.loadShipCatalog();
  const totalHp = Object.entries(fleet).reduce((sum, [name, count]) => {
    const stats = catalog[name];
    return sum + (stats ? stats.hp * count : 0);
  }, 0);

  let casualtyRate;
  if (result === 'win') {
    casualtyRate = pressure * 0.2;
  } else if (result === 'pyrrhic') {
    casualtyRate = pressure * 0.5;
  } else {
    casualtyRate = pressure * (target.lossFactor || 1);
  }

  const casualties = {};
  for (const [name, count] of Object.entries(fleet)) {
    const stats = catalog[name];
    if (!stats) continue;
    const hpShare = totalHp > 0 ? (stats.hp * count) / totalHp : 0;
    const lost = Math.min(count, Math.round(count * casualtyRate * hpShare));
    if (lost > 0) casualties[name] = lost;
  }

  const loot = {};
  if (result !== 'loss') {
    for (const [resource, range] of Object.entries(target.loot || {})) {
      const [min, max] = range;
      const base = Math.floor(randomRange(min, max + 1));
      const scaled = Math.max(0, Math.round(base * (1 + Math.max(0, margin))));
      loot[resource] = scaled;
    }
  }

  return { result, loot, casualties, rolls };
}

module.exports = {
  loadRaidTargets,
  rollPower,
  calculateFleetPowerWeighted,
  simulateBattle,
  DEFAULT_WEIGHTS,
};
