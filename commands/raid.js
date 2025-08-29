const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const path = require('path');
const raidUtils = require('../raidUtils');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');

// Custom display names for each difficulty
const DIFFICULTY_NAMES = {
  easy: 'Graven Belt',
  medium: 'Dyne Rift',
  hard: 'Razathaar Sector',
  extreme: 'Dominion Frontier'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Launch a raid against one of the available targets'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const charId = interaction.user.tag;

    const charData = await dbm.loadFile('characters', charId);
    if (!charData) {
      await interaction.reply({ content: 'Create a character first with /newchar.', ephemeral: true });
      return;
    }

    const now = Date.now();
    const COOLDOWN = 3 * 60 * 1000; // 1 hour
    if (charData.lastRaidAt && now - charData.lastRaidAt < COOLDOWN) {
      const mins = Math.ceil((COOLDOWN - (now - charData.lastRaidAt)) / 60000);
      await interaction.reply({ content: `You must wait ${mins} more minutes before raiding again.`, ephemeral: true });
      return;
    }

    const targets = await raidUtils.loadRaidTargets();
    const targetOptions = Object.keys(targets).map(key => ({
      label: DIFFICULTY_NAMES[key] ?? key,
      value: key
    }));
    const targetMenu = new StringSelectMenuBuilder()
      .setCustomId('raidTarget')
      .setPlaceholder('Select a target')
      .addOptions(targetOptions);

    const raidEmbed = new EmbedBuilder()
      .setTitle('Which ship bleeds for you tonight?')
      .setDescription('Select your prey from the dropdown menu')
      .setImage('attachment://raidPanel.png');

    const raidImage = new AttachmentBuilder(
      path.join(__dirname, '../assets/raidPanel.png'),
      { name: 'raidPanel.png' }
    );

    const replyMessage = await interaction.reply({
      embeds: [raidEmbed],
      components: [ new ActionRowBuilder().addComponents(targetMenu) ],
      files: [ raidImage ],
      flags: 64,
      fetchReply: true
    });

    const filter = i => i.user.id === userId;
    let targetInteraction;
    try {
      targetInteraction = await replyMessage.awaitMessageComponent({
        filter,
        componentType: ComponentType.StringSelect,
        time: 60000
      });
    } catch (err) {
      return;
    }

    const targetKey = targetInteraction.values[0];
    clientManager.setRaidSession(userId, { selectedTarget: targetKey });

    // Load the ship catalog so we know which entries are valid ships
    const catalog = await raidUtils.loadShipCatalog();

    // Build a temporary fleet combining owned ships with ship items in inventory
    const fleet = { ...(charData.fleet || {}) };
    if (charData.inventory) {
      for (const [itemName, qty] of Object.entries(charData.inventory)) {
        if (catalog[itemName]) {
          fleet[itemName] = (fleet[itemName] || 0) + qty;
        }
      }
    }

    const shipEntries = Object.entries(fleet)
      .filter(([name, count]) => catalog[name] && count > 0)
      .slice(0, 5);
    if (shipEntries.length === 0) {
      await interaction.editReply({ content: 'You have no ships to deploy.', components: [] });
      clientManager.clearRaidSession(userId);
      return;
    }

    const difficultyLabel = DIFFICULTY_NAMES[targetKey] ?? targetKey;
    await interaction.editReply({
      content: `Target **${difficultyLabel}** selected. Choose ships to deploy.`,
      components: []
    });

    const modal = new ModalBuilder().setCustomId('raidShipQuantities').setTitle('Ship Quantities');
    for (const [name, count] of shipEntries) {
      const input = new TextInputBuilder()
        .setCustomId(`qty_${name}`)
        .setLabel(`${name} (max ${count})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    await targetInteraction.showModal(modal);

    let modalInteraction;
    try {
      modalInteraction = await targetInteraction.awaitModalSubmit({
        filter: i => i.customId === 'raidShipQuantities' && i.user.id === userId,
        time: 60000
      });
      await modalInteraction.deferUpdate();
    } catch (err) {
      clientManager.clearRaidSession(userId);
      return;
    }

    const fleetSelection = {};
    for (const [name] of shipEntries) {
      const value = modalInteraction.fields.getTextInputValue(`qty_${name}`);
      const n = parseInt(value, 10);
      if (!isNaN(n) && n > 0) {
        fleetSelection[name] = n;
      }
    }

    clientManager.setRaidSession(userId, { selectedTarget: targetKey, fleetSelection });

    for (const [ship, qty] of Object.entries(fleetSelection)) {
      if (!fleet[ship] || fleet[ship] < qty) {
        await interaction.followUp({ content: `You do not have enough ${ship}.`, ephemeral: true });
        clientManager.clearRaidSession(userId);
        return;
      }
    }

    const weights = raidUtils.DEFAULT_WEIGHTS;
    const variance = 0.1;
    const sim = await raidUtils.simulateBattle(fleetSelection, targets[targetKey], weights, variance);

    // Remove casualties from fleet and inventory separately without merging them
    for (const [ship, lost] of Object.entries(sim.casualties)) {
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

    if (sim.result !== 'loss') {
      for (const [res, amt] of Object.entries(sim.loot)) {
        if (res === 'credits' || res === 'gold') {
          charData.balance = (charData.balance || 0) + amt;
        } else {
          if (!charData.inventory) charData.inventory = {};
          charData.inventory[res] = (charData.inventory[res] || 0) + amt;
        }
      }
    }

    charData.lastRaidAt = now;
    await dbm.saveFile('characters', charId, charData);

    await dbm.saveFile('raidLog', `${userId}-${now}`, {
      user: charId,
      target: targetKey,
      fleet: fleetSelection,
      rolls: sim.rolls,
      result: sim.result,
      loot: sim.loot,
      casualties: sim.casualties,
      timestamp: new Date(now).toISOString(),
    });

    const victoryImage = new AttachmentBuilder(
      path.join(__dirname, '../assets/VICTORY.PNG'),
      { name: 'VICTORY.PNG' }
    );
    const defeatImage = new AttachmentBuilder(
      path.join(__dirname, '../assets/FAILURE.PNG'),
      { name: 'FAILURE.PNG' }
    );

    const result = sim.result;
    const resultEmbed = new EmbedBuilder()
      .setTitle(`Raid ${result.toUpperCase()}`)
      .setColor(result === 'win' ? 0x00ff00 : result === 'pyrrhic' ? 0xffa500 : 0xff0000)
      .addFields(
        { name: 'Enemy Roll', value: sim.rolls.enemy.toFixed(2), inline: true },
        { name: 'Your Roll', value: sim.rolls.player.toFixed(2), inline: true },
      )
      .addFields({ name: 'Loot', value: Object.entries(sim.loot).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None' })
      .addFields({ name: 'Casualties', value: Object.entries(sim.casualties).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None' });

    if (result === 'loss') {
      resultEmbed.setImage('attachment://FAILURE.PNG');
    } else if (result === 'win' || result === 'pyrrhic') {
      resultEmbed.setImage('attachment://VICTORY.PNG');
    }

    if (result === 'loss') {
      await interaction.editReply({ embeds: [resultEmbed], files: [defeatImage], components: [] });
    } else if (result === 'win' || result === 'pyrrhic') {
      await interaction.editReply({ embeds: [resultEmbed], files: [victoryImage], components: [] });
    } else {
      await interaction.editReply({ embeds: [resultEmbed], components: [] });
    }
    clientManager.clearRaidSession(userId);
  },
};
