const { SlashCommandBuilder } = require('discord.js');
const clientManager = require('../clientManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Begin an exploration mission'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const numericID = interaction.user.id;

    if (clientManager.getExploreSession(numericID)) {
      await interaction.editReply({ content: 'You already have an active exploration session.' });
      return;
    }

    clientManager.setExploreSession(numericID, { stage: 'initial' });

    try {
      await interaction.editReply({ content: 'Exploration missions are coming soon. Stay tuned!' });
    } finally {
      clientManager.clearExploreSession(numericID);
    }
  }
};
