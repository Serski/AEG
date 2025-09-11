const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../char');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');

const getRand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Send your ships to mine for AFM'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const numericID = interaction.user.id;
    const charId = String(numericID);

    if (clientManager.getMineSession(numericID)) {
      await interaction.editReply({ content: 'You already have an active mining session.' });
      return;
    }

    const [player, charData] = await char.findPlayerData(charId);
    if (!charData) {
      await interaction.editReply({ content: 'Create a character first with /newchar.' });
      return;
    }

    const now = Date.now();
    const COOLDOWN = 3 * 60 * 1000; // 3 minutes
    if (charData.lastMineAt && now - charData.lastMineAt < COOLDOWN) {
      const mins = Math.ceil((COOLDOWN - (now - charData.lastMineAt)) / 60000);
      await interaction.editReply({ content: `You must wait ${mins} more minutes before mining again.` });
      return;
    }

    clientManager.setMineSession(numericID, { region: null });

    const regionMenu = new StringSelectMenuBuilder()
      .setCustomId('mineRegion')
      .setPlaceholder('Select a region')
      .addOptions([
        { label: 'Asteroid Belt', value: 'ASTEROID_BELT' },
        { label: 'Maw Drift', value: 'MAW_DRIFT' }
      ]);

    const regionEmbed = new EmbedBuilder()
      .setTitle('Choose a region to mine')
      .setImage('https://i.imgur.com/hpELIpq.jpeg');

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
      clientManager.clearMineSession(numericID);
      return;
    }

    const region = regionInteraction.values[0];
    clientManager.setMineSession(numericID, { region });

    const available = {
      Miner: (charData.fleet?.Miner || 0) + (charData.inventory?.Miner || 0),
      Atlas: (charData.fleet?.Atlas || 0) + (charData.inventory?.Atlas || 0)
    };

    const regionLabel = region === 'ASTEROID_BELT' ? 'Asteroid Belt' : 'Maw Drift';
    await interaction.editReply({
      content: `Region **${regionLabel}** selected.\n\nAvailable Ships:\nMiner: ${available.Miner}\nAtlas: ${available.Atlas}\n\nEnter ship quantities.`,
      components: []
    });

    const modal = new ModalBuilder().setCustomId('mineQuantities').setTitle('Ship Quantities');
    const minerInput = new TextInputBuilder()
      .setCustomId('qty_Miner')
      .setLabel(`Miner (available: ${available.Miner})`)
      .setPlaceholder(`0-${available.Miner}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const atlasInput = new TextInputBuilder()
      .setCustomId('qty_Atlas')
      .setLabel(`Atlas (available: ${available.Atlas})`)
      .setPlaceholder(`0-${available.Atlas}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    modal.addComponents(
      new ActionRowBuilder().addComponents(minerInput),
      new ActionRowBuilder().addComponents(atlasInput)
    );

    await regionInteraction.showModal(modal);

    let modalInteraction;
    try {
      modalInteraction = await regionInteraction.awaitModalSubmit({
        filter: i => i.customId === 'mineQuantities' && i.user.id === numericID,
        time: 60000
      });
      await modalInteraction.deferUpdate();
    } catch (err) {
      clientManager.clearMineSession(numericID);
      return;
    }

    const minerQtyRaw = parseInt(modalInteraction.fields.getTextInputValue('qty_Miner'), 10);
    const atlasQtyRaw = parseInt(modalInteraction.fields.getTextInputValue('qty_Atlas'), 10);
    const submitted = {};
    const minerQty = Math.max(0, Math.min(isNaN(minerQtyRaw) ? 0 : minerQtyRaw, available.Miner));
    const atlasQty = Math.max(0, Math.min(isNaN(atlasQtyRaw) ? 0 : atlasQtyRaw, available.Atlas));
    if (minerQty > 0) submitted.Miner = minerQty;
    if (atlasQty > 0) submitted.Atlas = atlasQty;

    if (Object.keys(submitted).length === 0) {
      await interaction.followUp({ content: 'You did not send any ships.' });
      clientManager.clearMineSession(numericID);
      return;
    }

    clientManager.setMineSession(numericID, { region, ships: submitted });

    if (region === 'MAW_DRIFT' && Math.random() < 0.05) {
      const abortReason = 'Pirates closed in, but the ships outran the trap and slipped away unharmed into open space.';
      charData.lastMineAt = now;
      await char.updatePlayer(player, charData);
      const abortEmbed = new EmbedBuilder()
        .setTitle('⛏️ Mining Aborted')
        .addFields(
          { name: 'Region', value: regionLabel, inline: true },
          { name: 'Ships Sent', value: Object.entries(submitted).map(([k, v]) => `${k}: ${v}`).join('\n'), inline: true },
          { name: 'AFM Gained', value: '0', inline: true },
          { name: 'Reason', value: abortReason }
        );
      await interaction.editReply({ embeds: [abortEmbed], components: [] });
      await dbm.saveFile('mineLog', `${numericID}-${now}`, {
        user: charId,
        region,
        ships: submitted,
        aborted: true,
        timestamp: new Date(now).toISOString()
      });
      clientManager.clearMineSession(numericID);
      return;
    }

    let afmGained = 0;

    for (let i = 0; i < (submitted.Miner || 0); i++) {
      afmGained += region === 'ASTEROID_BELT' ? getRand(2,5) : getRand(5,10);
    }
    for (let i = 0; i < (submitted.Atlas || 0); i++) {
      afmGained += region === 'ASTEROID_BELT' ? getRand(5,10) : getRand(15,20);
    }

    const losses = {};
    if (region === 'MAW_DRIFT') {
      const chance = (getRand(5,10)) / 100;
      if (Math.random() < chance) {
        let lossCount = Math.min(getRand(1,3), (submitted.Miner || 0) + (submitted.Atlas || 0));
        const pool = [];
        for (let i=0;i<(submitted.Miner||0);i++) pool.push('Miner');
        for (let i=0;i<(submitted.Atlas||0);i++) pool.push('Atlas');
        while (lossCount > 0 && pool.length > 0) {
          const idx = Math.floor(Math.random() * pool.length);
          const ship = pool.splice(idx,1)[0];
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
    charData.inventory.AFM = (charData.inventory.AFM || 0) + afmGained;
    charData.lastMineAt = now;
    await char.updatePlayer(player, charData);

    await dbm.saveFile('mineLog', `${numericID}-${now}`, {
      user: charId,
      region,
      ships: submitted,
      afmGained,
      losses,
      timestamp: new Date(now).toISOString()
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle('⛏️ Mining Result')
      .addFields(
        { name: 'Region', value: regionLabel, inline: true },
        { name: 'Ships Sent', value: Object.entries(submitted).map(([k,v])=>`${k}: ${v}`).join('\n'), inline: true },
        { name: 'AFM Gained', value: `${afmGained}`, inline: true }
      );
    if (Object.keys(losses).length > 0) {
      resultEmbed.addFields({ name: 'Losses', value: Object.entries(losses).map(([k,v])=>`${k}: ${v}`).join('\n') });
    }

    await interaction.editReply({ embeds: [resultEmbed], components: [] });
    clientManager.clearMineSession(numericID);
  }
};

