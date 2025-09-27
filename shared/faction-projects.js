const dbm = require('../database-manager');

const DEFAULT_PROJECTS = {
  nova: {
    name: 'Nova Initiative',
    crest: 'https://i.imgur.com/96Q6q8j.png',
    intro: [
      'Nova channels the ingenuity of its citizens into ambitious communal works.',
      'Contributions of materiel flow directly into projects that strengthen the faction\'s reach.'
    ].join(' '),
    color: 0x5865f2,
    categories: {
      infrastructure: [
        {
          id: 'starlit-foundry',
          name: 'Starlit Foundry',
          description: 'Expands fabrication lines to accelerate Nova\'s heavy industry output.',
          resources: {
            Iron: { goal: 1200, contributed: 380 },
            Stone: { goal: 950, contributed: 520 }
          }
        },
        {
          id: 'orbital-logistics-grid',
          name: 'Orbital Logistics Grid',
          description: 'Calibrates the jumpway relays linking every Nova holding.',
          resources: {
            Wood: { goal: 800, contributed: 440 },
            Lead: { goal: 650, contributed: 310 },
            Salt: { goal: 400, contributed: 160 }
          }
        }
      ],
      monuments: [
        {
          id: 'nova-archives',
          name: 'The Nova Archives',
          description: 'Construct a living archive to preserve centuries of exploration logs.',
          resources: {
            Leather: { goal: 500, contributed: 180 },
            Wool: { goal: 900, contributed: 640 }
          }
        },
        {
          id: 'celestial-observatory',
          name: 'Celestial Observatory',
          description: 'Raise a monument to chart the shifting constellations around Nova Prime.',
          resources: {
            Stone: { goal: 700, contributed: 300 },
            Iron: { goal: 350, contributed: 140 }
          }
        }
      ],
      classified: [
        {
          id: 'aegis-protocol',
          name: 'Project Aegis Protocol',
          description: 'Reinforce covert defensive grids protecting the initiative\'s enclaves.',
          resources: {
            Iron: { goal: 1000, contributed: 620 },
            Salt: { goal: 550, contributed: 220 },
            Lead: { goal: 450, contributed: 240 }
          }
        },
        {
          id: 'echo-listeners',
          name: 'Echo Listener Array',
          description: 'Deploy clandestine receivers to trace hostile fleet movements.',
          resources: {
            Salt: { goal: 600, contributed: 210 },
            Wood: { goal: 450, contributed: 150 },
            Leather: { goal: 250, contributed: 90 }
          }
        }
      ]
    }
  }
};

let cache = null;
let loading = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureLoaded() {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      let stored;
      try {
        stored = await dbm.loadCollection('factionProjects');
      } catch (err) {
        if (process.env.DEBUG) console.error('Failed to load factionProjects collection:', err);
        stored = {};
      }
      if (!stored || Object.keys(stored).length === 0) {
        stored = clone(DEFAULT_PROJECTS);
        await dbm.saveCollection('factionProjects', stored);
      } else {
        stored = mergeDefaults(clone(DEFAULT_PROJECTS), stored);
      }
      cache = stored;
      return cache;
    })();
  }
  await loading;
  return cache;
}

function mergeDefaults(defaults, stored) {
  const merged = { ...defaults, ...stored };
  for (const [factionKey, faction] of Object.entries(defaults)) {
    if (!stored[factionKey]) continue;
    const storedFaction = stored[factionKey];
    merged[factionKey] = {
      ...faction,
      ...storedFaction,
      categories: mergeCategories(faction.categories, storedFaction.categories || {})
    };
  }
  return merged;
}

function mergeCategories(defaultCategories, storedCategories) {
  const merged = { ...defaultCategories };
  for (const [key, projects] of Object.entries(storedCategories)) {
    if (!Array.isArray(projects)) continue;
    merged[key] = projects.map((project) => ({ ...project }));
  }
  return merged;
}

async function save(projectData) {
  cache = projectData;
  await dbm.saveCollection('factionProjects', projectData);
}

async function getProjectData() {
  return ensureLoaded();
}

async function getFaction(key) {
  const data = await ensureLoaded();
  return data[key];
}

async function getCategoryProjects(factionKey, categoryKey) {
  const faction = await getFaction(factionKey);
  if (!faction) return [];
  const categories = faction.categories || {};
  const projects = categories[categoryKey];
  if (!Array.isArray(projects)) return [];
  return projects;
}

function resolveResource(project, resourceName) {
  const keys = Object.keys(project.resources || {});
  return keys.find((key) => key.toLowerCase() === resourceName.toLowerCase());
}

async function donate(factionKey, categoryKey, projectId, resourceName, amount, options = {}) {
  const data = await ensureLoaded();
  const faction = data[factionKey];
  if (!faction) {
    throw new Error('Unknown faction.');
  }
  const category = faction.categories && faction.categories[categoryKey];
  if (!Array.isArray(category)) {
    throw new Error('Unknown project category.');
  }
  const project = category.find((entry) => entry.id === projectId);
  if (!project) {
    throw new Error('Unknown project.');
  }
  if (!project.resources || Object.keys(project.resources).length === 0) {
    throw new Error('Project does not require resources.');
  }
  const normalizedResource = typeof resourceName === 'string' ? resourceName.trim() : '';
  if (!normalizedResource) {
    throw new Error('Enter a resource to donate.');
  }
  const resourceKey = resolveResource(project, normalizedResource);
  if (!resourceKey) {
    throw new Error('Resource is not part of this project.');
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Donation amount must be a positive number.');
  }
  const resourceEntry = project.resources[resourceKey];
  resourceEntry.contributed = Number(resourceEntry.contributed || 0) + numericAmount;
  resourceEntry.lastContribution = new Date().toISOString();
  if (!project.contributors) {
    project.contributors = {};
  }
  if (options.userId) {
    const key = String(options.userId);
    project.contributors[key] = Number(project.contributors[key] || 0) + numericAmount;
  }
  await save(data);
  return {
    factionKey,
    categoryKey,
    project,
    resourceKey,
    amount: numericAmount,
    contributed: resourceEntry.contributed,
    goal: Number(resourceEntry.goal || 0)
  };
}

async function refreshCache() {
  cache = null;
  loading = null;
  return ensureLoaded();
}

module.exports = {
  getProjectData,
  getFaction,
  getCategoryProjects,
  donate,
  refreshCache,
};
