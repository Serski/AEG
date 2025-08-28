const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const raidUtils = require('../raidUtils');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');

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
    const COOLDOWN = 60 * 60 * 1000; // 1 hour
    if (charData.lastRaidAt && now - charData.lastRaidAt < COOLDOWN) {
      const mins = Math.ceil((COOLDOWN - (now - charData.lastRaidAt)) / 60000);
      await interaction.reply({ content: `You must wait ${mins} more minutes before raiding again.`, ephemeral: true });
      return;
    }

    const targets = await raidUtils.loadRaidTargets();
    const targetOptions = Object.keys(targets).map(key => ({ label: key, value: key }));
    const targetMenu = new StringSelectMenuBuilder()
      .setCustomId('raidTarget')
      .setPlaceholder('Select a target')
      .addOptions(targetOptions);
    const replyMessage = await interaction.reply({
      content: 'Choose a raid target',
      components: [new ActionRowBuilder().addComponents(targetMenu)],
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
      await targetInteraction.deferUpdate();
    } catch (err) {
      return;
    }

    const targetKey = targetInteraction.values[0];
    clientManager.setRaidSession(userId, { selectedTarget: targetKey });
    const fleet = charData.fleet || {};
    // Load the ship catalog so we know which fleet entries are valid ships
    const catalog = await raidUtils.loadShipCatalog();
    // Build an array of options: only include valid ship types from the catalog,
    // ignore non-ship items, and cap to 25 entries for Discord’s API
    const shipOptions = Object.entries(fleet)
      .filter(([name, count]) => catalog[name] && count > 0)
      .slice(0, 25)
      .map(([name, count]) => ({ label: `${name} (${count})`, value: name }));
    if (shipOptions.length === 0) {
      await replyMessage.edit({ content: 'You have no ships to deploy.', components: [] });
      clientManager.clearRaidSession(userId);
      return;
    }

    const shipMenu = new StringSelectMenuBuilder()
      .setCustomId('raidShips')
      .setPlaceholder('Select ships to send')
      .setMinValues(1)
      .setMaxValues(Math.min(shipOptions.length, 25))
      .addOptions(shipOptions);
    await replyMessage.edit({
      content: `Target **${targetKey}** selected. Choose ships to deploy.`,
      components: [new ActionRowBuilder().addComponents(shipMenu)]
    });

    let shipInteraction;
    try {
      shipInteraction = await replyMessage.awaitMessageComponent({
        filter,
        componentType: ComponentType.StringSelect,
        time: 60000
      });
      await shipInteraction.deferUpdate();
    } catch (err) {
      clientManager.clearRaidSession(userId);
      return;
    }

    const selectedShips = shipInteraction.values;
    await replyMessage.edit({
      content: 'Enter quantities for each ship in the format "Ship:Amount" separated by commas.',
      components: []
    });

    const msgFilter = m => m.author.id === userId;
    const collected = await interaction.channel.awaitMessages({ filter: msgFilter, max: 1, time: 60000 });
    if (collected.size === 0) {
      clientManager.clearRaidSession(userId);
      return;
    }

    const response = collected.first().content;
    const fleetSelection = {};
    response.split(',').forEach(part => {
      const [name, qty] = part.split(':').map(t => t.trim());
      const n = parseInt(qty, 10);
      if (name && !isNaN(n)) fleetSelection[name] = n;
    });

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

    for (const [ship, lost] of Object.entries(sim.casualties)) {
      fleet[ship] -= lost;
      if (fleet[ship] <= 0) delete fleet[ship];
    }
    charData.fleet = fleet;

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

    const embed = new EmbedBuilder()
      .setTitle(`Raid ${sim.result.toUpperCase()}`)
      .setColor(sim.result === 'win' ? 0x00ff00 : sim.result === 'pyrrhic' ? 0xffa500 : 0xff0000)
      .addFields(
        { name: 'Enemy Roll', value: sim.rolls.enemy.toFixed(2), inline: true },
        { name: 'Your Roll', value: sim.rolls.player.toFixed(2), inline: true },
      )
      .addFields({ name: 'Loot', value: Object.entries(sim.loot).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None' })
      .addFields({ name: 'Casualties', value: Object.entries(sim.casualties).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None' });

    await interaction.followUp({ embeds: [embed], ephemeral: true });
    clientManager.clearRaidSession(userId);
  },
};
