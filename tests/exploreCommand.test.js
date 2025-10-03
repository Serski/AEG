// Minimal env vars for requiring modules
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const exploreCmd = require('../commands/explore');
const clientManager = require('../clientManager');
const char = require('../char');
const { COOLDOWN_MS, REGION_CONFIG } = require('../shared/explore-data');

const sessionStore = new Map();

test.afterEach(() => {
  sessionStore.clear();
});

function mockSessions(t) {
  t.mock.method(clientManager, 'getExploreSession', (userId) => {
    return sessionStore.has(userId) ? sessionStore.get(userId) : null;
  });
  t.mock.method(clientManager, 'setExploreSession', (userId, data) => {
    sessionStore.set(userId, { ...data });
  });
  t.mock.method(clientManager, 'clearExploreSession', (userId) => {
    sessionStore.delete(userId);
  });
}

function createInteraction(t, userId, selectedRegion) {
  const replies = { edits: [], followUps: [] };
  const selectionUpdates = [];

  const selection = {
    values: [selectedRegion],
    update() {}
  };
  t.mock.method(selection, 'update', async (payload) => {
    selectionUpdates.push(payload);
    return payload;
  });

  const message = {
    awaitMessageComponent() {}
  };
  t.mock.method(message, 'awaitMessageComponent', async () => selection);

  const interaction = {
    user: { id: userId },
    guild: null,
    deferReply() {},
    editReply() {},
    followUp() {},
    fetchReply() {}
  };

  t.mock.method(interaction, 'deferReply', async () => {});
  t.mock.method(interaction, 'editReply', async (payload) => {
    replies.edits.push(payload);
    return payload;
  });
  t.mock.method(interaction, 'followUp', async (payload) => {
    replies.followUps.push(payload);
    return payload;
  });
  t.mock.method(interaction, 'fetchReply', async () => message);

  return { interaction, replies, selectionUpdates };
}

function stubCharacterData(t, charData, playerId = 'player-id') {
  t.mock.method(char, 'findPlayerData', async () => [playerId, charData]);
  const updateMock = t.mock.method(char, 'updatePlayer', async (id, data) => {
    return [id, data];
  });
  return updateMock;
}

function stubNow(t, value) {
  t.mock.method(Date, 'now', () => value);
}

function stubRandomSequence(t, values) {
  let index = 0;
  t.mock.method(Math, 'random', () => {
    const value = index < values.length ? values[index] : values.at(-1) ?? 0;
    index += 1;
    return value;
  });
}

function extractEmbedField(embeds, fieldName) {
  const embed = embeds[0];
  const data = embed?.data ?? embed;
  const fields = data?.fields ?? [];
  return fields.find((field) => field.name === fieldName);
}

async function withRegionOverride(regionKey, regionConfig, fn) {
  const originalRegion = REGION_CONFIG[regionKey];
  REGION_CONFIG[regionKey] = regionConfig;
  try {
    return await fn();
  } finally {
    if (originalRegion === undefined) {
      delete REGION_CONFIG[regionKey];
    } else {
      REGION_CONFIG[regionKey] = originalRegion;
    }
  }
}

test('explore command enforces cooldown window', { concurrency: false }, async (t) => {
  mockSessions(t);
  const now = 1_000_000;
  stubNow(t, now);
  stubRandomSequence(t, [0.1]);

  const remainingSeconds = 90;
  const charData = {
    boundShips: { KZ90: 1 },
    fleet: {},
    inventory: { KZ90: 1 },
    lastExploreAt: now - (COOLDOWN_MS - remainingSeconds * 1000)
  };

  const updateMock = stubCharacterData(t, charData);
  const { interaction, replies } = createInteraction(t, 'cooldown-user', 'FRINGE');

  await exploreCmd.execute(interaction);

  assert.equal(replies.edits.length, 1);
  assert.match(replies.edits[0].content, /You must wait 1 minute and 30 seconds before exploring again\./);
  assert.equal(replies.followUps.length, 0);
  assert.equal(updateMock.mock.calls.length, 0);
  assert.equal(sessionStore.size, 0);
});

test('explore command blocks concurrent sessions', { concurrency: false }, async (t) => {
  mockSessions(t);
  const userId = 'active-user';
  sessionStore.set(userId, { stage: 'existing-session' });
  stubNow(t, 5_000);
  stubRandomSequence(t, [0.2]);

  const { interaction, replies } = createInteraction(t, userId, 'FRINGE');

  await exploreCmd.execute(interaction);

  assert.equal(replies.edits.length, 1);
  assert.equal(replies.edits[0].content, 'You already have an active exploration session.');
  assert.equal(replies.followUps.length, 0);
  assert.deepEqual(sessionStore.get(userId), { stage: 'existing-session' });
});

test('explore command awards curio rewards exclusively when selected', { concurrency: false }, async (t) => {
  mockSessions(t);
  const userId = 'reward-user';
  const now = 2_000_000;
  stubNow(t, now);
  stubRandomSequence(t, [0.1, 0.0, 0.19]);

  const regionKey = 'UNIT_TEST_REWARD';
  await withRegionOverride(
    regionKey,
    {
      key: regionKey,
      label: 'Test Region',
      description: 'Unit test region',
      probabilities: { reward: 1 },
      encounters: [
        {
          id: 'UT_ENCOUNTER',
          line: 'Test encounter in the dunes.',
          outcomes: {
            reward: {
              curio: 'Test Curio',
              salvage: { GGP: [10, 12] },
              ships: { Skiff: [1, 2] }
            }
          }
        }
      ]
    },
    async () => {
      const charData = {
        boundShips: { KZ90: 1 },
        fleet: {},
        inventory: { KZ90: 1 },
        lastExploreAt: now - COOLDOWN_MS - 1000
      };

      const updateMock = stubCharacterData(t, charData);
      const { interaction, replies, selectionUpdates } = createInteraction(t, userId, regionKey);

      await exploreCmd.execute(interaction);

      assert.ok(selectionUpdates.some((payload) => /Region confirmed: \*\*Test Region\*\*/.test(payload.content)));
      assert.equal(replies.followUps.length, 1);
      const followPayload = replies.followUps[0];
      assert.ok(Array.isArray(followPayload.embeds));

      const encounterField = extractEmbedField(followPayload.embeds, 'Encounter');
      assert.equal(encounterField.value, 'Test encounter in the dunes.');

      const outcomeField = extractEmbedField(followPayload.embeds, 'Outcome');
      assert.equal(outcomeField.value, 'Recovery teams return with secured artifacts.');

      const assetsField = extractEmbedField(followPayload.embeds, 'Recovered Assets');
      assert.ok(assetsField.value.includes('Curio secured: **Test Curio**'));
      assert.ok(!/GGP:/.test(assetsField.value));
      assert.ok(!/Skiff:/.test(assetsField.value));

      assert.equal(charData.inventory['Test Curio'], 1);
      assert.ok(!('GGP' in charData.inventory));
      assert.ok(!('Skiff' in charData.fleet));
      assert.equal(charData.lastExploreAt, now);

      assert.equal(updateMock.mock.calls.length, 1);
      const session = sessionStore.get(userId);
      assert.equal(session.stage, 'resolved');
      assert.equal(session.resolution.outcome, 'reward');
      assert.equal(session.resolution.reward.curio, 'Test Curio');
      assert.deepEqual(session.resolution.reward.inventory, { 'Test Curio': 1 });
      assert.deepEqual(session.resolution.reward.fleet, {});
    }
  );
});

test('explore command awards salvage and ships when selected', { concurrency: false }, async (t) => {
  mockSessions(t);
  const userId = 'salvage-user';
  const now = 2_500_000;
  stubNow(t, now);
  stubRandomSequence(t, [0.1, 0.0, 0.81, 0.0, 0.9]);

  const regionKey = 'UNIT_TEST_SALVAGE';
  await withRegionOverride(
    regionKey,
    {
      key: regionKey,
      label: 'Test Region',
      description: 'Unit test region',
      probabilities: { reward: 1 },
      encounters: [
        {
          id: 'UT_ENCOUNTER',
          line: 'Test encounter in the dunes.',
          outcomes: {
            reward: {
              curio: 'Test Curio',
              salvage: { GGP: [10, 12] },
              ships: { Skiff: [1, 2] }
            }
          }
        }
      ]
    },
    async () => {
      const charData = {
        boundShips: { KZ90: 1 },
        fleet: {},
        inventory: { KZ90: 1 },
        lastExploreAt: now - COOLDOWN_MS - 1000
      };

      const updateMock = stubCharacterData(t, charData);
      const { interaction, replies, selectionUpdates } = createInteraction(t, userId, regionKey);

      await exploreCmd.execute(interaction);

      assert.ok(selectionUpdates.some((payload) => /Region confirmed: \*\*Test Region\*\*/.test(payload.content)));
      assert.equal(replies.followUps.length, 1);
      const followPayload = replies.followUps[0];
      assert.ok(Array.isArray(followPayload.embeds));

      const encounterField = extractEmbedField(followPayload.embeds, 'Encounter');
      assert.equal(encounterField.value, 'Test encounter in the dunes.');

      const outcomeField = extractEmbedField(followPayload.embeds, 'Outcome');
      assert.equal(outcomeField.value, 'Recovery teams return with secured artifacts.');

      const assetsField = extractEmbedField(followPayload.embeds, 'Recovered Assets');
      assert.ok(!assetsField.value.includes('Curio secured: **Test Curio**'));
      assert.ok(assetsField.value.includes('GGP: 10'));
      assert.ok(assetsField.value.includes('Skiff: 2'));

      assert.ok(!('Test Curio' in charData.inventory));
      assert.equal(charData.inventory.GGP, 10);
      assert.equal(charData.fleet.Skiff, 2);
      assert.equal(charData.lastExploreAt, now);

      assert.equal(updateMock.mock.calls.length, 1);
      const session = sessionStore.get(userId);
      assert.equal(session.stage, 'resolved');
      assert.equal(session.resolution.outcome, 'reward');
      assert.equal(session.resolution.reward.curio, null);
      assert.deepEqual(session.resolution.reward.inventory, { GGP: 10 });
      assert.deepEqual(session.resolution.reward.fleet, { Skiff: 2 });
    }
  );
});

test('explore command records ship destruction losses', { concurrency: false }, async (t) => {
  mockSessions(t);
  const userId = 'destroy-user';
  const now = 3_000_000;
  stubNow(t, now);
  stubRandomSequence(t, [0.1, 0.0]);

  const regionKey = 'UNIT_TEST_DESTROYED';
  await withRegionOverride(
    regionKey,
    {
      key: regionKey,
      label: 'Hazard Zone',
      description: 'Unit hazard region',
      probabilities: { destroyed: 1 },
      encounters: [
        {
          id: 'UT_DESTROY',
          line: 'Test hazard encounter.',
          outcomes: {
            destroyed: 'Hazards tear the ship apart.',
            reward: { salvage: {} },
            nothing: 'Nothing happens.'
          }
        }
      ]
    },
    async () => {
      const charData = {
        boundShips: { KZ90: 1 },
        fleet: { KZ90: 1 },
        inventory: { KZ90: 1 },
        lastExploreAt: 0
      };

      const updateMock = stubCharacterData(t, charData);
      const { interaction, replies } = createInteraction(t, userId, regionKey);

      await exploreCmd.execute(interaction);

      assert.equal(replies.followUps.length, 1);
      const followPayload = replies.followUps[0];
      const outcomeField = extractEmbedField(followPayload.embeds, 'Outcome');
      assert.equal(outcomeField.value, 'Hazards tear the ship apart.');

      const lossesField = extractEmbedField(followPayload.embeds, 'Losses');
      assert.ok(lossesField.value.includes('KZ90 Research Ship destroyed during expedition.'));

      assert.ok(!('KZ90' in charData.boundShips));
      assert.equal(charData.fleet.KZ90, 1);
      assert.equal(charData.inventory.KZ90, 1);
      assert.equal(charData.lastExploreAt, now);

      assert.equal(updateMock.mock.calls.length, 1);
      const session = sessionStore.get(userId);
      assert.equal(session.stage, 'resolved');
      assert.equal(session.resolution.outcome, 'destroyed');
    }
  );
});

test('explore command awards rare ship drops when triggered', { concurrency: false }, async (t) => {
  mockSessions(t);
  const userId = 'rare-user';
  const now = 4_000_000;
  stubNow(t, now);
  stubRandomSequence(t, [0.05, 0.4, 0.25, 0.0]);

  const regionKey = 'UNIT_TEST_RARE';
  await withRegionOverride(
    regionKey,
    {
      key: regionKey,
      label: 'Rare Veil',
      description: 'Unit rare region',
      probabilities: { reward: 1 },
      rareShip: { chance: 0.5, options: ['Rare Skiff'] },
      encounters: [
        {
          id: 'UT_RARE',
          line: 'Test rare encounter.',
          outcomes: {
            reward: {
              curio: 'Rare Curio',
              salvage: {}
            }
          }
        }
      ]
    },
    async () => {
      const charData = {
        boundShips: { KZ90: 1 },
        fleet: {},
        inventory: {},
        lastExploreAt: 0
      };

      const updateMock = stubCharacterData(t, charData);
      const { interaction, replies } = createInteraction(t, userId, regionKey);

      await exploreCmd.execute(interaction);

      assert.equal(replies.followUps.length, 1);
      const followPayload = replies.followUps[0];
      const assetsField = extractEmbedField(followPayload.embeds, 'Recovered Assets');
      assert.ok(assetsField.value.includes('Curio secured: **Rare Curio**'));

      const rareField = extractEmbedField(followPayload.embeds, 'Rare Discovery');
      assert.ok(rareField.value.includes('Recovered **Rare Skiff** schematic.'));

      assert.equal(charData.inventory['Rare Curio'], 1);
      assert.equal(charData.inventory['Rare Skiff'], 1);
      assert.equal(charData.lastExploreAt, now);

      assert.equal(updateMock.mock.calls.length, 1);
      const session = sessionStore.get(userId);
      assert.equal(session.stage, 'resolved');
      assert.equal(session.resolution.outcome, 'reward');
      assert.equal(session.resolution.rareShip, 'Rare Skiff');
    }
  );
});
