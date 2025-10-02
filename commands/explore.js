const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder
} = require('discord.js');
const clientManager = require('../clientManager');
const char = require('../char');
const { COOLDOWN_MS, EXPLORE_IMAGE, REGION_CONFIG } = require('../shared/explore-data');
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

      const selectMenuId = `explore-region-select-${numericID}`;
      const embed = new EmbedBuilder()
        .setTitle('Exploration Briefing – Step 1')
        .setDescription('Select a sector to chart for your upcoming expedition.')
        .setImage(EXPLORE_IMAGE);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(selectMenuId)
        .setPlaceholder('Choose a region to explore')
        .addOptions(
          Object.values(REGION_CONFIG).map((region) => ({
            label: region.label,
            value: region.key,
            description: region.description
          }))
        );

      const components = [new ActionRowBuilder().addComponents(selectMenu)];

      await interaction.editReply({ embeds: [embed], components });

      const message = await interaction.fetchReply();

      let selection;
      try {
        selection = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id && i.customId === selectMenuId,
          componentType: ComponentType.StringSelect,
          time: 60_000
        });
      } catch (error) {
        if (
          error.code === 'INTERACTION_COLLECTOR_ERROR' ||
          error.code === 'InteractionCollectorError' ||
          error.message?.includes('time')
        ) {
          await interaction.editReply({
            content: 'Exploration briefing expired before a region was selected. Please run /explore again when you are ready.',
            embeds: [],
            components: []
          });
          clientManager.clearExploreSession(numericID);
          return;
        }
        throw error;
      }

      const selectedKey = selection.values[0];
      const regionConfig = REGION_CONFIG[selectedKey];

      if (!regionConfig) {
        await selection.update({
          content: 'The selected region is no longer available. Please try starting a new exploration mission later.',
          embeds: [],
          components: []
        });
        clientManager.clearExploreSession(numericID);
        return;
      }

      const updatedSession = {
        ...clientManager.getExploreSession(numericID),
        stage: 'regionSelected',
        region: regionConfig.key
      };
      clientManager.setExploreSession(numericID, updatedSession);

      await selection.update({
        content: `Region confirmed: **${regionConfig.label}**. Prepare for mission step 2.`,
        embeds: [],
        components: []
      });

      setupComplete = true;
    } finally {
      if (!setupComplete) {
        clientManager.clearExploreSession(numericID);
      }
    }
  }
};
