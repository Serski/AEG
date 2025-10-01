// Minimal env vars for requiring modules
process.env.TOKEN = 'test';
process.env.CLIENT_ID = 'test';
process.env.GUILD_ID = 'test';
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

const test = require('node:test');
const assert = require('node:assert/strict');

const clientManager = require('../clientManager');
const exploreCmd = require('../commands/explore');

test('explore command enforces single-session guard', async (t) => {
  const userId = 'explorer';
  clientManager.clearExploreSession(userId);

  let reply;
  const interaction = {
    deferReply: async () => {},
    editReply: async (msg) => { reply = msg; return msg; },
    user: { id: userId }
  };

  await exploreCmd.execute(interaction);
  assert.equal(reply.content ?? reply, 'Exploration missions are coming soon. Stay tuned!');
  assert.equal(clientManager.getExploreSession(userId), null);

  clientManager.setExploreSession(userId, { stage: 'test' });
  reply = undefined;
  await exploreCmd.execute(interaction);
  assert.equal(reply.content ?? reply, 'You already have an active exploration session.');
  assert.notEqual(clientManager.getExploreSession(userId), null);
  clientManager.clearExploreSession(userId);
});
