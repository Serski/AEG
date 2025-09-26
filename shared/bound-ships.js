function ensureBoundShips(charData) {
  if (!charData.boundShips || typeof charData.boundShips !== 'object') {
    charData.boundShips = {};
  }
  return charData.boundShips;
}

function bindShipsForMission(charData, selection) {
  ensureBoundShips(charData);
  if (!charData.fleet) charData.fleet = {};
  if (!charData.inventory) charData.inventory = {};

  for (const [ship, qty] of Object.entries(selection || {})) {
    if (!qty || qty <= 0) continue;

    const currentBound = charData.boundShips[ship] || 0;
    const tradeableFleet = charData.fleet[ship] || 0;
    const tradeableInventory = charData.inventory[ship] || 0;
    const tradeableTotal = tradeableFleet + tradeableInventory;

    const neededFromTradeable = Math.max(0, qty - Math.min(qty, currentBound));
    if (neededFromTradeable <= 0 || tradeableTotal <= 0) {
      continue;
    }

    const convertible = Math.min(neededFromTradeable, tradeableTotal);
    let remainingToConvert = convertible;

    if (tradeableFleet > 0) {
      const fromFleet = Math.min(remainingToConvert, tradeableFleet);
      charData.fleet[ship] = tradeableFleet - fromFleet;
      if (charData.fleet[ship] <= 0) {
        delete charData.fleet[ship];
      }
      remainingToConvert -= fromFleet;
    }

    if (remainingToConvert > 0 && tradeableInventory > 0) {
      const fromInventory = Math.min(remainingToConvert, tradeableInventory);
      charData.inventory[ship] = tradeableInventory - fromInventory;
      if (charData.inventory[ship] <= 0) {
        delete charData.inventory[ship];
      }
      remainingToConvert -= fromInventory;
    }

    const converted = convertible - remainingToConvert;
    if (converted > 0) {
      charData.boundShips[ship] = (charData.boundShips[ship] || 0) + converted;
    }
  }
}

function applyShipCasualties(charData, casualties) {
  ensureBoundShips(charData);
  for (const [ship, lost] of Object.entries(casualties || {})) {
    let remaining = lost;
    if (remaining <= 0) continue;

    if (charData.boundShips && charData.boundShips[ship]) {
      const fromBound = Math.min(remaining, charData.boundShips[ship]);
      charData.boundShips[ship] -= fromBound;
      if (charData.boundShips[ship] <= 0) {
        delete charData.boundShips[ship];
      }
      remaining -= fromBound;
    }

    if (remaining > 0 && charData.fleet && charData.fleet[ship]) {
      const fromFleet = Math.min(remaining, charData.fleet[ship]);
      charData.fleet[ship] -= fromFleet;
      if (charData.fleet[ship] <= 0) {
        delete charData.fleet[ship];
      }
      remaining -= fromFleet;
    }

    if (remaining > 0 && charData.inventory && charData.inventory[ship]) {
      const fromInventory = Math.min(remaining, charData.inventory[ship]);
      charData.inventory[ship] -= fromInventory;
      if (charData.inventory[ship] <= 0) {
        delete charData.inventory[ship];
      }
      remaining -= fromInventory;
    }
  }
}

module.exports = {
  ensureBoundShips,
  bindShipsForMission,
  applyShipCasualties
};
