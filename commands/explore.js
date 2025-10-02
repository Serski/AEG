const { SlashCommandBuilder } = require('discord.js');
const clientManager = require('../clientManager');
const char = require('../char');
const { COOLDOWN_MS } = require('../shared/explore-data');
const { ensureBoundShips, bindShipsForMission } = require('../shared/bound-ships');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Begin an exploration mission'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const numericID = interaction.user.id;
    const charId = String(numericID);

    if (clientManager.getExploreSession(numericID)) {
      await interaction.editReply({ content: 'You already have an active exploration session.' });
      return;
    }

    clientManager.setExploreSession(numericID, { stage: 'setup' });

    let setupComplete = false;

    try {
      const [player, charData] = await char.findPlayerData(charId);
      if (!charData) {
        await interaction.editReply({ content: 'Create a character first with /newchar.' });
        return;
      }

      ensureBoundShips(charData);

      const now = Date.now();
      if (charData.lastExploreAt && now - charData.lastExploreAt < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - (now - charData.lastExploreAt);
        const mins = Math.ceil(remaining / 60000);
        const hours = Math.floor(mins / 60);
        const minutes = mins % 60;
        await interaction.editReply({ content: `You must wait ${hours} hours and ${minutes} minutes before exploring again.` });
        return;
      }

      const boundKz90 = charData.boundShips?.KZ90 || 0;
      const fleetKz90 = charData.fleet?.KZ90 || 0;
      const inventoryKz90 = charData.inventory?.KZ90 || 0;
      const totalKz90 = boundKz90 + fleetKz90 + inventoryKz90;

      if (totalKz90 <= 0) {
        await interaction.editReply({ content: 'You need a KZ90 Research Ship to begin an exploration mission.' });
        return;
      }

      if (boundKz90 <= 0) {
        bindShipsForMission(charData, { KZ90: 1 });
        await char.updatePlayer(player, charData);
      }

      const sessionData = {
        stage: 'initial',
        playerId: player,
        charId,
        startedAt: now
      };
      clientManager.setExploreSession(numericID, sessionData);

      await interaction.editReply({ content: 'Exploration mission setup complete. Your KZ90 Research Ship is ready for launch.' });
      setupComplete = true;
    } finally {
      if (!setupComplete) {
        clientManager.clearExploreSession(numericID);
      }
    }
  }
};
