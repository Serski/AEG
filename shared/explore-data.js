const EXPLORE_IMAGE = 'https://i.imgur.com/zCEGfel.jpeg';
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

const CURIO_DEFINITIONS = {
  'Glass-Sand Urn': { gold: 1000 },
  'Gold Monolith': { gold: 1000 },
  'Evacuation Chit': { gold: 500 },
  'Outpost Access Sigil': { gold: 500 },
  'Shrine Lantern': { gold: 300 },
  'Emergency Override Keycard': { gold: 1000 },
  'Ash-Etched Reliquary': { gold: 1000 },
  'Drowned Circuit Board': { gold: 800 },
  'Elevator Spindle Core': { gold: 800 },
  'Rod Shard Talisman': { gold: 800 },
  'Shadowless Spire Fragment': { gold: 2000 },
  'Bone Crystal Effigy': { gold: 2600 },
  'Vacuum Hymnal': { gold: 2600 },
  'Future Evac Log': { gold: 3700 },
  'Starlight Fruit': { gold: 3500 }
};

const REGION_CONFIG = {
  FRINGE: {
    key: 'FRINGE',
    label: 'The Fringe',
    description: 'Frontier sector zones',
    probabilities: { destroyed: 0.05, nothing: 0.25, reward: 0.70 },
    rareShip: { chance: 0.02, options: ['Miner', 'Corvette'] },
    encounters: [
      {
        id: 'FRINGE_1',
        line: 'Survey notes: a ruined city lies half‑buried in glassy sand; ash‑painted locals observed at distance.',
        outcomes: {
          destroyed: 'Locals ignite reactive pitch; hull scorches and ruptures during ascent.',
          nothing: 'Settlement scatters into dust storms; no safe entry points located.',
          reward: {
            curio: 'Glass-Sand Urn',
            salvage: { GGP: [50, 50] }
          }
        }
      },
      {
        id: 'FRINGE_2',
        line: 'Exploration report: fires on the plains surround a tribe worshipping a monolith of unknown origin.',
        outcomes: {
          destroyed: 'Heat shimmer hides sinkholes; landing strut shears.',
          nothing: 'Monolith site vacated overnight.',
          reward: {
            curio: 'Gold Monolith',
            salvage: { AFM: [20, 30], QFR: [10, 20] }
          }
        }
      },
      {
        id: 'FRINGE_3',
        line: 'Recon log: collapsed colony detected, warning sirens active; children’s toys scattered in the dust.',
        outcomes: {
          destroyed: 'Auto‑turret sweep holes cockpit.',
          nothing: 'Everything stripped; records corrupted.',
          reward: {
            curio: 'Evacuation Chit',
            salvage: { PCC: [50, 50], OOP: [5, 10], NCM: [2, 5] }
          }
        }
      },
      {
        id: 'FRINGE_4',
        line: 'Scan record: jungle vines pulsate as they overtake a derelict Federation outpost.',
        outcomes: {
          destroyed: 'Bioelectric tendrils spike avionics.',
          nothing: 'Outpost vaults sealed.',
          reward: {
            curio: 'Outpost Access Sigil',
            salvage: { QFR: [5, 10] }
          }
        }
      },
      {
        id: 'FRINGE_5',
        line: 'Field report: descendants of miners still inhabit ice tunnels, maintaining dim shrines and lamps.',
        outcomes: {
          destroyed: 'Ice shelf calves; hangar bay crushed.',
          nothing: 'Custodians refuse contact.',
          reward: {
            curio: 'Shrine Lantern',
            salvage: { OOP: [5, 10] }
          }
        }
      }
    ]
  },

  DEAD_ZONES: {
    key: 'DEAD_ZONES',
    label: 'The Dead Zones',
    description: 'Forsaken sector zones',
    probabilities: { destroyed: 0.15, nothing: 0.35, reward: 0.50 },
    rareShip: { chance: 0.01, options: ['Destroyer'] },
    encounters: [
      {
        id: 'DEAD_ZONES_1',
        line: 'Skeletal towers rise from a chemical swamp; automated speakers still loop evacuation orders.',
        outcomes: {
          destroyed: 'Acid rain corrodes engines; reactor breach.',
          nothing: 'Vaults sealed; no entry.',
          reward: {
            curio: 'Emergency Override Keycard',
            salvage: { OOP: [10, 30] }
          }
        }
      },
      {
        id: 'DEAD_ZONES_2',
        line: 'Cratered habitats, bones fused with alloy; Dominion prayer‑etchings still visible.',
        outcomes: {
          destroyed: 'Hidden mines detonate on approach.',
          nothing: 'Artifacts stripped.',
          reward: {
            curio: 'Ash-Etched Reliquary',
            salvage: { OOP: [20, 40] }
          }
        }
      },
      {
        id: 'DEAD_ZONES_3',
        line: 'Submerged factory complex under oily floodwaters; lights flicker in drowned chambers.',
        outcomes: {
          destroyed: 'Collapse crushes ship on docking.',
          nothing: 'Entrances sealed in silt.',
          reward: {
            curio: 'Drowned Circuit Board',
            salvage: { OOP: [20, 30] }
          }
        }
      },
      {
        id: 'DEAD_ZONES_4',
        line: 'Scorched orbital elevator stump; cables trail into endless dust storms.',
        outcomes: {
          destroyed: 'Magnetic storm drags ship into wreckage.',
          nothing: 'Nothing but static storms.',
          reward: {
            curio: 'Elevator Spindle Core',
            salvage: { GGP: [20, 40] }
          }
        }
      },
      {
        id: 'DEAD_ZONES_5',
        line: 'Hollowed reactors line a canyon; fuel rods glow faintly in the dust.',
        outcomes: {
          destroyed: 'Radiation surge cripples systems.',
          nothing: 'Fuel rods cracked and inert.',
          reward: {
            curio: 'Rod Shard Talisman',
            salvage: { PCC: [30, 50] }
          }
        }
      }
    ]
  },

  BEYOND: {
    key: 'BEYOND',
    label: 'The Beyond',
    description: 'Final frontier',
    probabilities: { destroyed: 0.25, nothing: 0.40, reward: 0.35 },
    rareShip: { chance: 0.005, options: ['Cruiser'] },
    encounters: [
      {
        id: 'BEYOND_1',
        line: 'A city of black glass spirals upward, yet casts no shadow.',
        outcomes: {
          destroyed: 'Gravity shear flips the KZ90 inside‑out.',
          nothing: 'City collapses into ash.',
          reward: {
            curio: 'Shadowless Spire Fragment',
            salvage: { QFR: [20, 50] }
          }
        }
      },
      {
        id: 'BEYOND_2',
        line: 'Statues of your crew line a valley, carved from perfect bone crystal.',
        outcomes: {
          destroyed: 'Statues animate, tearing into the hull.',
          nothing: 'Statues collapse to dust.',
          reward: {
            curio: 'Bone Crystal Effigy',
            salvage: { NCM: [40, 60] }
          }
        }
      },
      {
        id: 'BEYOND_3',
        line: 'A cathedral floats unsupported above a salt flat, choir audible in vacuum.',
        outcomes: {
          destroyed: 'Resonance shatters the hull.',
          nothing: 'Cathedral phases away.',
          reward: {
            curio: 'Vacuum Hymnal',
            salvage: { Graveglass: [2, 2] }
          }
        }
      },
      {
        id: 'BEYOND_4',
        line: 'A dead colony still transmits… from next year.',
        outcomes: {
          destroyed: 'Chronal inversion consumes the vessel.',
          nothing: 'Transmission desyncs.',
          reward: {
            curio: 'Future Evac Log',
            salvage: { NCM: [30, 60] }
          }
        }
      },
      {
        id: 'BEYOND_5',
        line: 'An orchard of star‑trees grows in the void, fruit pulsing with nebula light.',
        outcomes: {
          destroyed: 'Fruit bursts, engulfing ship.',
          nothing: 'Fruit rots to dust.',
          reward: {
            curio: 'Starlight Fruit',
            salvage: { QFR: [40, 80] }
          }
        }
      }
    ]
  }
};

function ensureCurioDefinitions() {
  // In case you want lazy initialisation or conversion to a Map
  return CURIO_DEFINITIONS;
}

module.exports = {
  EXPLORE_IMAGE,
  COOLDOWN_MS,
  CURIO_DEFINITIONS,
  REGION_CONFIG,
  ensureCurioDefinitions
};
