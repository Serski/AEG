const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../char');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');
const { ensureBoundShips, bindShipsForMission, applyShipCasualties } = require('../shared/bound-ships');

const getRand = (min, max, rand = Math.random) => Math.floor(rand() * (max - min + 1)) + min;

// Trade command global cooldown in milliseconds
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 day

// Trade configuration for each region
const TRADE_RULES = {
  SECTOR: {
    earnings: [50, 100],
    bridgerBonus: 10,
    moneyLoss: {
      chance: 0.1,
      range: [20, 50],
      failureTexts: [
        'Pirates skimmed off a portion of the profits.',
        'A corrupt dockmaster seized part of the cargo.',
        'An unexpected tariff cut into your earnings.'
      ],
      compensation: ['Bridger', 'Miner', 'Harvester']
    }
  },
  FEDERATION: {
    earnings: [100, 200],
    bridgerBonus: 20,
    moneyLoss: {
      chance: 0.15,
      range: [50, 100],
      failureTexts: [
        'Federation patrols demanded heavy taxes.',
        'A rival trader undercut your deal.',
        'Storms damaged part of your cargo.'
      ],
      compensation: ['Bridger', 'Miner', 'Harvester']
    }
  },
  DOMINION: {
    earnings: [150, 250],
    bridgerBonus: 30,
    moneyLoss: {
      chance: 0.2,
      range: [75, 150],
      failureTexts: [
        'Dominion agents confiscated valuable goods.',
        'Bandits made off with part of the haul.',
        'Local warlords extorted your caravans.'
      ],
      compensation: ['Bridger', 'Miner', 'Harvester']
    },
    shipLoss: {
      chanceRange: [5, 10],
      countRange: [1, 3]
    }
  }
};

function performTrade(charData, region, submitted, now, rand = Math.random) {
  ensureBoundShips(charData);
  bindShipsForMission(charData, submitted);

  const rules = TRADE_RULES[region];
  let earnings = 0;
  for (let i = 0; i < (submitted.Freighter || 0); i++) {
    earnings += getRand(rules.earnings[0], rules.earnings[1], rand);
  }
  for (let i = 0; i < (submitted.Bridger || 0); i++) {
    earnings += Math.floor(getRand(rules.earnings[0], rules.earnings[1], rand) * 1.5);
  }

  let moneyLost = 0;
  let failureText = null;
  let compensationItem = null;
  if (rand() < rules.moneyLoss.chance) {
    moneyLost = getRand(rules.moneyLoss.range[0], rules.moneyLoss.range[1], rand);
    failureText = rules.moneyLoss.failureTexts[getRand(0, rules.moneyLoss.failureTexts.length - 1, rand)];
    compensationItem = rules.moneyLoss.compensation[getRand(0, rules.moneyLoss.compensation.length - 1, rand)];
    if (!charData.inventory) charData.inventory = {};
    charData.inventory[compensationItem] = (charData.inventory[compensationItem] || 0) + 1;
  }

  let losses = {};
  if (region === 'DOMINION') {
    const chance = getRand(rules.shipLoss.chanceRange[0], rules.shipLoss.chanceRange[1], rand) / 100;
    if (rand() < chance) {
      let lossCount = Math.min(getRand(rules.shipLoss.countRange[0], rules.shipLoss.countRange[1], rand), (submitted.Bridger || 0) + (submitted.Freighter || 0));
      const pool = [];
      for (let i = 0; i < (submitted.Bridger || 0); i++) pool.push('Bridger');
      for (let i = 0; i < (submitted.Freighter || 0); i++) pool.push('Freighter');
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

  const netGold = Math.max(earnings - moneyLost, 0);
  charData.balance = Math.max((charData.balance || 0) + netGold, 0);
  charData.lastTradeAt = now;

  return { earnings, moneyLost, netGold, losses, failureText, compensationItem };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Send your freighters on trade runs for Gold'),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    const numericID = interaction.user.id;
    const charId = String(numericID);

    if (clientManager.getTradeSession(numericID)) {
      await interaction.editReply({ content: 'You already have an active trade session.' });
      return;
    }

    const [player, charData] = await char.findPlayerData(charId);
    if (!charData) {
      await interaction.editReply({ content: 'Create a character first with /newchar.' });
      return;
    }

    ensureBoundShips(charData);

    const now = Date.now();
    if (charData.lastTradeAt && now - charData.lastTradeAt < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - charData.lastTradeAt);
      const mins = Math.ceil(remaining / 60000);
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      await interaction.editReply({ content: `You must wait ${hours} hours and ${minutes} minutes before trading again.` });
      return;
    }

    clientManager.setTradeSession(numericID, { region: null });

    const regionMenu = new StringSelectMenuBuilder()
      .setCustomId('tradeRegion')
      .setPlaceholder('Select a region')
      .addOptions([
        { label: 'Sector Trade', value: 'SECTOR' },
        { label: 'Federation Area Trade', value: 'FEDERATION' },
        { label: 'Dominion Area Trade', value: 'DOMINION' }
      ]);

    const regionEmbed = new EmbedBuilder()
      .setTitle('Choose a trade region')
      .setImage('https://i.imgur.com/nq6Sblw.jpeg');

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
      clientManager.clearTradeSession(numericID);
      return;
    }

    const region = regionInteraction.values[0];
    clientManager.setTradeSession(numericID, { region });
    const available = {
      Bridger:
        (charData.fleet?.Bridger || 0) +
        (charData.inventory?.Bridger || 0) +
        (charData.boundShips?.Bridger || 0),
      Freighter:
        (charData.fleet?.Freighter || 0) +
        (charData.inventory?.Freighter || 0) +
        (charData.boundShips?.Freighter || 0)
    };

    const regionLabel = {
      SECTOR: 'Sector Trade',
      FEDERATION: 'Federation Area Trade',
      DOMINION: 'Dominion Area Trade'
    }[region];

    await interaction.editReply({
      content:
        `Region **${regionLabel}** selected.\n\n` +
        `**Available Ships**\nBridger: ${available.Bridger}\nFreighter: ${available.Freighter}\n\n` +
        `Enter ship quantities.`,
      components: []
    });

    const modal = new ModalBuilder().setCustomId('tradeQuantities').setTitle('Ship Quantities');
    const bridgerInput = new TextInputBuilder()
      .setCustomId('qty_Bridger')
      .setLabel(`Bridger (available: ${available.Bridger})`)
      .setPlaceholder(`0-${available.Bridger}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const freighterInput = new TextInputBuilder()
      .setCustomId('qty_Freighter')
      .setLabel(`Freighter (available: ${available.Freighter})`)
      .setPlaceholder(`0-${available.Freighter}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    modal.addComponents(
      new ActionRowBuilder().addComponents(bridgerInput),
      new ActionRowBuilder().addComponents(freighterInput)
    );

    await regionInteraction.showModal(modal);

    let modalInteraction;
    try {
      modalInteraction = await regionInteraction.awaitModalSubmit({
        filter: i => i.customId === 'tradeQuantities' && i.user.id === numericID,
        time: 60000
      });
      await modalInteraction.deferUpdate();
    } catch (err) {
      clientManager.clearTradeSession(numericID);
      return;
    }

    const submitted = {};
    let bridgerQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Bridger'), 10);
    let freighterQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Freighter'), 10);
    if (!isNaN(bridgerQty)) {
      bridgerQty = Math.min(Math.max(bridgerQty, 0), available.Bridger);
      if (bridgerQty > 0) submitted.Bridger = bridgerQty;
    }
    if (!isNaN(freighterQty)) {
      freighterQty = Math.min(Math.max(freighterQty, 0), available.Freighter);
      if (freighterQty > 0) submitted.Freighter = freighterQty;
    }

    if (Object.keys(submitted).length === 0) {
      await interaction.followUp({ content: 'You did not send any ships.' });
      clientManager.clearTradeSession(numericID);
      return;
    }

    clientManager.setTradeSession(numericID, { region, ships: submitted });

    const { earnings, moneyLost, netGold, losses, failureText, compensationItem } = performTrade(charData, region, submitted, now);
    await char.updatePlayer(player, charData);

    await dbm.saveFile('tradeLog', `${numericID}-${now}`, {
      user: charId,
      region,
      ships: submitted,
      earnings,
      moneyLost,
      netGold,
      losses,
      failureText,
      compensationItem,
      timestamp: new Date(now).toISOString()
    });

    const goldEmoji = clientManager.getEmoji('Gold') || 'Gold';
    const embed = new EmbedBuilder()
      .setTitle('💰 Trade Result')
      .addFields(
        { name: 'Region', value: regionLabel, inline: true },
        { name: 'Ships Sent', value: Object.entries(submitted).map(([k,v]) => `${k}: ${v}`).join('\n'), inline: true },
        { name: 'Gold Earned', value: `${goldEmoji} ${earnings}`, inline: true },
        { name: 'Gold Lost', value: `${goldEmoji} ${moneyLost}`, inline: true },
        { name: 'Net Gold', value: `${goldEmoji} ${netGold}`, inline: true }
      );

    if (compensationItem) {
      embed.addFields({ name: 'Compensation', value: compensationItem, inline: true });
    }
    if (Object.keys(losses).length > 0) {
      embed.addFields({ name: 'Ship Losses', value: Object.entries(losses).map(([k,v]) => `${k}: ${v}`).join('\n'), inline: true });
    }
    if (failureText) {
      embed.addFields({ name: 'Failure', value: failureText });
    }

    await interaction.editReply({ embeds: [embed], components: [] });
    clientManager.clearTradeSession(numericID);
  },
  _performTrade: performTrade,
  TRADE_RULES,
  COOLDOWN_MS
};

