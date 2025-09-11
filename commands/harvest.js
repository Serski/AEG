const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../char');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');

function performHarvest(charData, region, submitted, now, rand = Math.random) {
  let pccGained = 0;
  const getRand = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  for (let i = 0; i < (submitted.Harvester || 0); i++) {
    pccGained += region === 'GAS_GIANT' ? getRand(2, 4) : getRand(4, 8);
  }
  for (let i = 0; i < (submitted.Aether || 0); i++) {
    pccGained += region === 'GAS_GIANT' ? getRand(4, 8) : getRand(10, 15);
  }

  const losses = {};
  if (region === 'STORM_ZONE') {
    const chance = getRand(5, 15) / 100;
    if (rand() < chance) {
      let lossCount = Math.min(getRand(1, 3), (submitted.Harvester || 0) + (submitted.Aether || 0));
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

  // Deduct losses from fleet then inventory
  for (const [ship, lost] of Object.entries(losses)) {
    let remaining = lost;
    if (charData.fleet && charData.fleet[ship]) {
      const fromFleet = Math.min(remaining, charData.fleet[ship]);
      charData.fleet[ship] -= fromFleet;
      if (charData.fleet[ship] <= 0) delete charData.fleet[ship];
      remaining -= fromFleet;
    }
    if (remaining > 0 && charData.inventory && charData.inventory[ship]) {
      const fromInventory = Math.min(remaining, charData.inventory[ship]);
      charData.inventory[ship] -= fromInventory;
      if (charData.inventory[ship] <= 0) delete charData.inventory[ship];
      remaining -= fromInventory;
    }
  }

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

    const now = Date.now();
    const COOLDOWN = 3 * 60 * 1000; // 3 minutes
    if (charData.lastHarvestAt && now - charData.lastHarvestAt < COOLDOWN) {
      const mins = Math.ceil((COOLDOWN - (now - charData.lastHarvestAt)) / 60000);
      await interaction.editReply({ content: `You must wait ${mins} more minutes before harvesting again.` });
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

    const regionLabel = region === 'GAS_GIANT' ? 'Gas Giant Upper Atmosphere' : 'Storm Zone';
    await interaction.editReply({ content: `Region **${regionLabel}** selected. Enter ship quantities.`, components: [] });

    const modal = new ModalBuilder().setCustomId('harvestQuantities').setTitle('Ship Quantities');
    const harvesterInput = new TextInputBuilder()
      .setCustomId('qty_Harvester')
      .setLabel('Harvester (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const aetherInput = new TextInputBuilder()
      .setCustomId('qty_Aether')
      .setLabel('Aether (optional)')
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
    const harvesterQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Harvester'), 10);
    const aetherQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Aether'), 10);
    if (!isNaN(harvesterQty) && harvesterQty > 0) submitted.Harvester = harvesterQty;
    if (!isNaN(aetherQty) && aetherQty > 0) submitted.Aether = aetherQty;

    if (Object.keys(submitted).length === 0) {
      await interaction.followUp({ content: 'You did not send any ships.' });
      clientManager.clearHarvestSession(numericID);
      return;
    }

    const available = {
      Harvester: (charData.fleet?.Harvester || 0) + (charData.inventory?.Harvester || 0),
      Aether: (charData.fleet?.Aether || 0) + (charData.inventory?.Aether || 0)
    };

    for (const [ship, qty] of Object.entries(submitted)) {
      if (qty > available[ship]) {
        await interaction.followUp({ content: `You do not have enough ${ship}.` });
        clientManager.clearHarvestSession(numericID);
        return;
      }
    }

    clientManager.setHarvestSession(numericID, { region, ships: submitted });

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

