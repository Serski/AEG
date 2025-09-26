const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../char');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');
const {
  ensureBoundShips,
  bindShipsForMission,
  applyShipCasualties
} = require('../shared/bound-ships');

const getRand = (min, max, rand = Math.random) => Math.floor(rand() * (max - min + 1)) + min;

function performHarvest(charData, region, submitted, now, rand = Math.random) {
  let pccGained = 0;

  for (let i = 0; i < (submitted.Harvester || 0); i++) {
    pccGained += region === 'GAS_GIANT' ? getRand(2, 4, rand) : getRand(4, 8, rand);
  }
  for (let i = 0; i < (submitted.Aether || 0); i++) {
    pccGained += region === 'GAS_GIANT' ? getRand(4, 8, rand) : getRand(10, 15, rand);
  }

  const losses = {};
  if (region === 'STORM_ZONE') {
    const chance = getRand(5, 15, rand) / 100;
    if (rand() < chance) {
      let lossCount = Math.min(getRand(1, 3, rand), (submitted.Harvester || 0) + (submitted.Aether || 0));
      const pool = [];
      for (let i = 0; i < (submitted.Harvester || 0); i++) pool.push('Harvester');
      for (let i = 0; i < (submitted.Aether || 0); i++) pool.push('Aether');
      while (lossCount > 0 && pool.length > 0) {
        const idx = Math.floor(rand() * pool.length);
        const ship = pool.splice(idx, 1)[0];
        submitted[ship]--;
        losses[ship] = (losses[ship] || 0) + 1;
        lossCount--;
      }
    }
  }

  applyShipCasualties(charData, losses);

  if (!charData.inventory) charData.inventory = {};
  charData.inventory.PCC = (charData.inventory.PCC || 0) + pccGained;
  charData.lastHarvestAt = now;

  return { pccGained, losses };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('harvest')
    .setDescription('Send your ships to harvest PCC'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const numericID = interaction.user.id;
    const charId = String(numericID);

    if (clientManager.getHarvestSession(numericID)) {
      await interaction.editReply({ content: 'You already have an active harvest session.' });
      return;
    }

    const [player, charData] = await char.findPlayerData(charId);
    if (!charData) {
      await interaction.editReply({ content: 'Create a character first with /newchar.' });
      return;
    }

    ensureBoundShips(charData);

    const now = Date.now();
    const COOLDOWN = 24 * 60 * 60 * 1000; // 1 day
    if (charData.lastHarvestAt && now - charData.lastHarvestAt < COOLDOWN) {
      const remaining = COOLDOWN - (now - charData.lastHarvestAt);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      await interaction.editReply({ content: `You must wait ${hours} hours and ${minutes} minutes before harvesting again.` });
      return;
    }

    clientManager.setHarvestSession(numericID, { region: null });

    const regionMenu = new StringSelectMenuBuilder()
      .setCustomId('harvestRegion')
      .setPlaceholder('Select a region')
      .addOptions([
        { label: 'Gas Giant Upper Atmosphere', value: 'GAS_GIANT' },
        { label: 'Storm Zone', value: 'STORM_ZONE' }
      ]);

    const regionEmbed = new EmbedBuilder()
      .setTitle('Choose a region to harvest')
      .setImage('https://i.imgur.com/JsNcz17.jpeg');

    await interaction.editReply({
      embeds: [regionEmbed],
      components: [new ActionRowBuilder().addComponents(regionMenu)]
    });

    const replyMessage = await interaction.fetchReply();

    let regionInteraction;
    try {
      regionInteraction = await replyMessage.awaitMessageComponent({
        filter: i => i.user.id === numericID,
        componentType: ComponentType.StringSelect,
        time: 60000
      });
    } catch (err) {
      clientManager.clearHarvestSession(numericID);
      return;
    }

    const region = regionInteraction.values[0];
    clientManager.setHarvestSession(numericID, { region });

    const available = {
      Harvester:
        (charData.fleet?.Harvester || 0) +
        (charData.inventory?.Harvester || 0) +
        (charData.boundShips?.Harvester || 0),
      Aether:
        (charData.fleet?.Aether || 0) +
        (charData.inventory?.Aether || 0) +
        (charData.boundShips?.Aether || 0)
    };

    const regionLabel = region === 'GAS_GIANT' ? 'Gas Giant Upper Atmosphere' : 'Storm Zone';
    await interaction.editReply({
      content: `Region **${regionLabel}** selected.\nAvailable Ships:\nHarvester: ${available.Harvester}\nAether: ${available.Aether}\nEnter ship quantities.`,
      components: []
    });

    const modal = new ModalBuilder().setCustomId('harvestQuantities').setTitle('Ship Quantities');
    const harvesterInput = new TextInputBuilder()
      .setCustomId('qty_Harvester')
      .setLabel(`Harvester (available: ${available.Harvester})`)
      .setPlaceholder(`0-${available.Harvester}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const aetherInput = new TextInputBuilder()
      .setCustomId('qty_Aether')
      .setLabel(`Aether (available: ${available.Aether})`)
      .setPlaceholder(`0-${available.Aether}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    modal.addComponents(
      new ActionRowBuilder().addComponents(harvesterInput),
      new ActionRowBuilder().addComponents(aetherInput)
    );

    await regionInteraction.showModal(modal);

    let modalInteraction;
    try {
      modalInteraction = await regionInteraction.awaitModalSubmit({
        filter: i => i.customId === 'harvestQuantities' && i.user.id === numericID,
        time: 60000
      });
      await modalInteraction.deferUpdate();
    } catch (err) {
      clientManager.clearHarvestSession(numericID);
      return;
    }

    const submitted = {};
    const harvesterInputVal = parseInt(modalInteraction.fields.getTextInputValue('qty_Harvester'), 10);
    const aetherInputVal = parseInt(modalInteraction.fields.getTextInputValue('qty_Aether'), 10);
    const harvesterQty = Math.max(0, Math.min(available.Harvester, isNaN(harvesterInputVal) ? 0 : harvesterInputVal));
    const aetherQty = Math.max(0, Math.min(available.Aether, isNaN(aetherInputVal) ? 0 : aetherInputVal));
    if (harvesterQty > 0) submitted.Harvester = harvesterQty;
    if (aetherQty > 0) submitted.Aether = aetherQty;

    if (!submitted.Harvester && !submitted.Aether) {
      await interaction.followUp({ content: 'You did not send any ships.' });
      clientManager.clearHarvestSession(numericID);
      return;
    }

    clientManager.setHarvestSession(numericID, { region, ships: submitted });

    if (region === 'STORM_ZONE') {
      const failChance = getRand(5, 8) / 100;
      if (Math.random() < failChance) {
        charData.lastHarvestAt = now;
        await char.updatePlayer(player, charData);
        await dbm.saveFile('harvestLog', `${numericID}-${now}`, {
          user: charId,
          region,
          ships: submitted,
          pccGained: 0,
          losses: {},
          aborted: true,
          timestamp: new Date(now).toISOString()
        });
        const abortEmbed = new EmbedBuilder()
          .setTitle('🧪 Harvest Aborted')
          .setDescription('A volatile magnetar surge ripped across the sector, driving the ships to disengage and flee to safety.')
          .addFields(
            { name: 'Region', value: regionLabel, inline: true },
            { name: 'Ships Sent', value: Object.entries(submitted).map(([k, v]) => `${k}: ${v}`).join('\n'), inline: true },
            { name: 'PCC Gained', value: '0', inline: true }
          );
        await interaction.editReply({ embeds: [abortEmbed], components: [] });
        clientManager.clearHarvestSession(numericID);
        return;
      }
    }

    bindShipsForMission(charData, submitted);

    const { pccGained, losses } = performHarvest(charData, region, submitted, now);
    await char.updatePlayer(player, charData);

    await dbm.saveFile('harvestLog', `${numericID}-${now}`, {
      user: charId,
      region,
      ships: submitted,
      pccGained,
      losses,
      timestamp: new Date(now).toISOString()
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle('🧪 PCC Harvest Result')
      .addFields(
        { name: 'Region', value: regionLabel, inline: true },
        { name: 'Ships Sent', value: Object.entries(submitted).map(([k, v]) => `${k}: ${v}`).join('\n'), inline: true },
        { name: 'PCC Gained', value: `${pccGained}`, inline: true }
      );
    if (Object.keys(losses).length > 0) {
      resultEmbed.addFields({ name: 'Losses', value: Object.entries(losses).map(([k, v]) => `${k}: ${v}`).join('\n') });
    }

    await interaction.editReply({ embeds: [resultEmbed], components: [] });
    clientManager.clearHarvestSession(numericID);
  },
  _performHarvest: performHarvest
};

