const fs = require('fs');
const path = require('path');

function fromEnv() {
  const {
    TOKEN,
    CLIENT_ID,
    GUILD_ID,
    DATABASE_URL,
    NODE_ENV,
    GPT_TOKEN,
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID,
    DISCORD_DATABASE_URL,
    DISCORD_NODE_ENV,
    DISCORD_GPT_TOKEN
  } = process.env;

  return {
    token: TOKEN || DISCORD_TOKEN,
    clientId: CLIENT_ID || DISCORD_CLIENT_ID,
    guildId: GUILD_ID || DISCORD_GUILD_ID,
    databaseUrl: DATABASE_URL || DISCORD_DATABASE_URL,
    nodeEnv: NODE_ENV || DISCORD_NODE_ENV,
    gptToken: GPT_TOKEN || DISCORD_GPT_TOKEN
  };
}

function fromFile() {
  const filePath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      token: data.TOKEN || data.token || data.DISCORD_TOKEN,
      clientId: data.CLIENT_ID || data.clientId || data.DISCORD_CLIENT_ID,
      guildId: data.GUILD_ID || data.guildId || data.DISCORD_GUILD_ID,
      databaseUrl: data.DATABASE_URL || data.databaseUrl || data.DISCORD_DATABASE_URL,
      nodeEnv: data.NODE_ENV || data.nodeEnv || data.DISCORD_NODE_ENV,
      gptToken: data.GPT_TOKEN || data.gptToken || data.DISCORD_GPT_TOKEN
    };
  } catch (err) {
    console.error('Error reading config.json', err);
    return {};
  }
}

const config = { ...fromFile(), ...fromEnv() };

const required = ['token', 'clientId', 'guildId', 'databaseUrl'];
const missing = required.filter((key) => !config[key]);

if (missing.length > 0) {
  console.error(`Missing required configuration: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = { ...config, fromEnv, fromFile };

