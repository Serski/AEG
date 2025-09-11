const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../char');
const dbm = require('../database-manager');
const clientManager = require('../clientManager');

const getRand = (min, max, rand = Math.random) => Math.floor(rand() * (max - min + 1)) + min;

// Trade command global cooldown in milliseconds
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

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
      compensation: ['Wood', 'Leather', 'Stone']
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
      compensation: ['Iron', 'Lead', 'Salt']
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
      compensation: ['Horse', 'Wool', 'Stone']
    },
    shipLoss: {
      chanceRange: [5, 10],
      countRange: [1, 3]
    }
  }
};

function performTrade(charData, region, submitted, now, rand = Math.random) {
  const rules = TRADE_RULES[region];
  let earnings = 0;
  for (let i = 0; i < (submitted.Freighter || 0); i++) {
    earnings += getRand(rules.earnings[0], rules.earnings[1], rand);
    earnings += (submitted.Bridger || 0) * rules.bridgerBonus;
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

    const now = Date.now();
    if (charData.lastTradeAt && now - charData.lastTradeAt < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (now - charData.lastTradeAt)) / 60000);
      await interaction.editReply({ content: `You must wait ${mins} more minutes before trading again.` });
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
      .setImage('https://i.imgur.com/2hW2c4z.jpeg');

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

    const regionLabel = {
      SECTOR: 'Sector Trade',
      FEDERATION: 'Federation Area Trade',
      DOMINION: 'Dominion Area Trade'
    }[region];

    await interaction.editReply({ content: `Region **${regionLabel}** selected. Enter ship quantities.`, components: [] });

    const modal = new ModalBuilder().setCustomId('tradeQuantities').setTitle('Ship Quantities');
    const bridgerInput = new TextInputBuilder()
      .setCustomId('qty_Bridger')
      .setLabel('Bridger (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    const freighterInput = new TextInputBuilder()
      .setCustomId('qty_Freighter')
      .setLabel('Freighter (optional)')
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
    const bridgerQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Bridger'), 10);
    const freighterQty = parseInt(modalInteraction.fields.getTextInputValue('qty_Freighter'), 10);
    if (!isNaN(bridgerQty) && bridgerQty > 0) submitted.Bridger = bridgerQty;
    if (!isNaN(freighterQty) && freighterQty > 0) submitted.Freighter = freighterQty;

    if (Object.keys(submitted).length === 0) {
      await interaction.followUp({ content: 'You did not send any ships.' });
      clientManager.clearTradeSession(numericID);
      return;
    }

    const available = {
      Bridger: (charData.fleet?.Bridger || 0) + (charData.inventory?.Bridger || 0),
      Freighter: (charData.fleet?.Freighter || 0) + (charData.inventory?.Freighter || 0)
    };

    for (const [ship, qty] of Object.entries(submitted)) {
      if (qty > available[ship]) {
        await interaction.followUp({ content: `You do not have enough ${ship}.` });
        clientManager.clearTradeSession(numericID);
        return;
      }
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

