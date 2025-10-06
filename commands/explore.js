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

function rollInclusive(min, max) {
  const lower = Number(min);
  const upper = Number(max);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new Error('rollInclusive requires finite numeric bounds.');
  }
  const realMin = Math.min(lower, upper);
  const realMax = Math.max(lower, upper);
  return Math.floor(Math.random() * (realMax - realMin + 1)) + realMin;
}

function rollOutcome(probabilities = {}) {
  const entries = Object.entries(probabilities);
  if (!entries.length) {
    return 'nothing';
  }

  const roll = Math.random();
  let cumulative = 0;
  for (const [key, chance] of entries) {
    const weight = Number(chance) || 0;
    cumulative += weight;
    if (roll < cumulative) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}

function resolveReward(rewardConfig = {}) {
  const rewards = { inventory: {}, fleet: {}, curio: null };
  if (!rewardConfig || typeof rewardConfig !== 'object') {
    return rewards;
  }

  const curioId = rewardConfig.curio;
  const salvageEntries =
    rewardConfig.salvage && typeof rewardConfig.salvage === 'object'
      ? Object.entries(rewardConfig.salvage)
      : [];
  const shipEntries =
    rewardConfig.ships && typeof rewardConfig.ships === 'object'
      ? Object.entries(rewardConfig.ships)
      : [];

  const hasCurio = Boolean(curioId);
  const hasResourceRewards = salvageEntries.length > 0 || shipEntries.length > 0;

  let useCurioRewards = hasCurio;
  if (hasCurio && hasResourceRewards) {
    useCurioRewards = Math.random() < 0.2;
  }

  if (useCurioRewards && curioId) {
    rewards.curio = curioId;
    rewards.inventory[curioId] = (rewards.inventory[curioId] || 0) + 1;
    return rewards;
  }

  for (const [resource, value] of salvageEntries) {
    let amount = 0;
    if (Array.isArray(value)) {
      const [min, max] = value;
      amount = rollInclusive(min, max);
    } else if (typeof value === 'number') {
      amount = value;
    }

    if (amount > 0) {
      rewards.inventory[resource] = (rewards.inventory[resource] || 0) + amount;
    }
  }

  for (const [shipName, value] of shipEntries) {
    let amount = 0;
    if (Array.isArray(value)) {
      const [min, max] = value;
      amount = rollInclusive(min, max);
    } else if (typeof value === 'number') {
      amount = value;
    }

    if (amount > 0) {
      rewards.fleet[shipName] = (rewards.fleet[shipName] || 0) + amount;
    }
  }

  return rewards;
}

async function maybeSendNews(interaction, region, encounter, outcomeKey, rewardResult, rareShipAwarded) {
  if (outcomeKey !== 'destroyed') {
    return;
  }

  const guild = interaction?.guild;
  if (!guild || !guild.channels?.cache) {
    return;
  }

  const newsChannel = guild.channels.cache.find(
    (channel) => channel.name === 'news-feed' && typeof channel.isTextBased === 'function' && channel.isTextBased()
  );

  if (!newsChannel) {
    return;
  }

  const outcomeColours = {
    reward: 0x2ecc71,
    destroyed: 0xb22222,
    nothing: 0x708090
  };

  const encounterLine = encounter?.line || 'Expedition telemetry received without incident.';
  const outcomes = encounter?.outcomes || {};
  let outcomeSummary = '';

  if (typeof outcomes[outcomeKey] === 'string') {
    outcomeSummary = outcomes[outcomeKey];
  } else if (outcomeKey === 'reward') {
    outcomeSummary = 'Recovery teams secure valuable salvage.';
  } else if (outcomeKey === 'destroyed') {
    outcomeSummary = 'Vessel lost with all hands.';
  } else {
    outcomeSummary = 'Survey concluded without notable findings.';
  }

  const rewardLines = [];
  if (outcomeKey === 'reward' && rewardResult) {
    if (rewardResult.curio) {
      rewardLines.push(`Curio recovered: **${rewardResult.curio}**`);
    }
    for (const [item, amount] of Object.entries(rewardResult.inventory || {})) {
      if (rewardResult.curio === item) continue;
      rewardLines.push(`${item}: ${amount}`);
    }
    for (const [ship, amount] of Object.entries(rewardResult.fleet || {})) {
      rewardLines.push(`${ship}: ${amount}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`Expedition Dispatch – ${region?.label || 'Unknown Sector'}`)
    .setColor(outcomeColours[outcomeKey] ?? 0x1f2933)
    .setDescription(encounterLine)
    .addFields({ name: 'Outcome', value: outcomeSummary })
    .setTimestamp();

  if (rewardLines.length) {
    embed.addFields({ name: 'Recovered Assets', value: rewardLines.join('\n') });
  }

  if (rareShipAwarded) {
    embed.addFields({ name: 'Rare Discovery', value: `Recovered schematics for **${rareShipAwarded}**.` });
  }

  if (outcomeKey === 'destroyed') {
    embed.addFields({ name: 'Casualty Report', value: 'KZ90 Research Ship lost during mission.' });
  }

  try {
    await newsChannel.send({ content: ':EXPLORE:', embeds: [embed] });
  } catch (error) {
    console.error('[explore] Failed to send news-feed dispatch:', error);
  }
}

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
        const totalSeconds = Math.ceil(remaining / 1000);
        const timeUnits = [
          { label: 'day', seconds: 24 * 60 * 60 },
          { label: 'hour', seconds: 60 * 60 },
          { label: 'minute', seconds: 60 },
          { label: 'second', seconds: 1 }
        ];

        let remainingSeconds = totalSeconds;
        const parts = [];

        for (const { label, seconds } of timeUnits) {
          if (remainingSeconds <= 0) {
            break;
          }
          const value = Math.floor(remainingSeconds / seconds);
          if (value > 0) {
            parts.push(`${value} ${label}${value === 1 ? '' : 's'}`);
            remainingSeconds -= value * seconds;
          }
        }

        if (parts.length === 0) {
          parts.push('0 seconds');
        }

        const formatList = (items) => {
          if (items.length === 1) {
            return items[0];
          }
          if (items.length === 2) {
            return `${items[0]} and ${items[1]}`;
          }
          return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
        };

        await interaction.editReply({ content: `You must wait ${formatList(parts)} before exploring again.` });
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
        content: `Region confirmed: **${regionConfig.label}**. Expedition underway...`,
        embeds: [],
        components: []
      });

      let resolutionComplete = false;
      try {
        const encounters = Array.isArray(regionConfig.encounters) ? regionConfig.encounters : [];
        if (!encounters.length) {
          throw new Error(`Region ${regionConfig.key} has no encounters configured.`);
        }

        const encounter = encounters[Math.floor(Math.random() * encounters.length)];
        const outcomeKey = rollOutcome(regionConfig.probabilities);
        const outcomes = encounter.outcomes || {};
        let rewardResult = { inventory: {}, fleet: {}, curio: null };
        let rareShipAwarded = null;

        if (!charData.inventory || typeof charData.inventory !== 'object') {
          charData.inventory = {};
        }
        if (!charData.fleet || typeof charData.fleet !== 'object') {
          charData.fleet = {};
        }
        if (!charData.boundShips || typeof charData.boundShips !== 'object') {
          charData.boundShips = {};
        }

        const ensurePositiveMap = (target, updates = {}) => {
          for (const [key, amount] of Object.entries(updates)) {
            if (!Number.isFinite(amount) || amount <= 0) continue;
            target[key] = (target[key] || 0) + amount;
            if (target[key] <= 0) {
              delete target[key];
            }
          }
        };

        if (outcomeKey === 'reward') {
          rewardResult = resolveReward(outcomes.reward);
          ensurePositiveMap(charData.inventory, rewardResult.inventory);
          ensurePositiveMap(charData.fleet, rewardResult.fleet);

          if (regionConfig.rareShip && Array.isArray(regionConfig.rareShip.options) && regionConfig.rareShip.options.length) {
            const rareChance = Number(regionConfig.rareShip.chance) || 0;
            if (Math.random() < rareChance) {
              const optionIndex = rollInclusive(0, regionConfig.rareShip.options.length - 1);
              rareShipAwarded = regionConfig.rareShip.options[optionIndex];
              if (rareShipAwarded) {
                charData.inventory[rareShipAwarded] = (charData.inventory[rareShipAwarded] || 0) + 1;
              }
            }
          }
        } else if (outcomeKey === 'destroyed') {
          const deductShip = (collection, shipName) => {
            if (!collection || !collection[shipName]) return false;
            collection[shipName] -= 1;
            if (collection[shipName] <= 0) {
              delete collection[shipName];
            }
            return true;
          };

          if (!deductShip(charData.boundShips, 'KZ90')) {
            if (!deductShip(charData.fleet, 'KZ90')) {
              deductShip(charData.inventory, 'KZ90');
            }
          }
        }

        charData.lastExploreAt = now;
        await char.updatePlayer(player, charData);

        const fields = [];
        const encounterLine = encounter.line || 'Your crew reports an uncharted anomaly.';
        const outcomeDetails =
          typeof outcomes[outcomeKey] === 'string'
            ? outcomes[outcomeKey]
            : outcomeKey === 'reward'
              ? 'Recovery teams return with secured artifacts.'
              : 'Mission outcome recorded.';

        fields.push({ name: 'Encounter', value: encounterLine });
        fields.push({ name: 'Outcome', value: outcomeDetails });

        const rewardLines = [];
        if (outcomeKey === 'reward') {
          if (rewardResult.curio) {
            rewardLines.push(`Curio secured: **${rewardResult.curio}**`);
          }
          for (const [item, amount] of Object.entries(rewardResult.inventory)) {
            if (rewardResult.curio === item) continue;
            rewardLines.push(`${item}: ${amount}`);
          }
          for (const [ship, amount] of Object.entries(rewardResult.fleet)) {
            rewardLines.push(`${ship}: ${amount}`);
          }
          if (!rewardLines.length) {
            rewardLines.push('No salvage recovered.');
          }
          fields.push({ name: 'Recovered Assets', value: rewardLines.join('\n') });
        }

        if (rareShipAwarded) {
          fields.push({ name: 'Rare Discovery', value: `Recovered **${rareShipAwarded}** schematic.` });
        }

        if (outcomeKey === 'destroyed') {
          fields.push({ name: 'Losses', value: 'KZ90 Research Ship destroyed during expedition.' });
        }

        const reportEmbed = new EmbedBuilder()
          .setTitle(`Exploration Report – ${regionConfig.label}`)
          .setDescription('Mission telemetry received.')
          .setFields(fields)
          .setImage(EXPLORE_IMAGE);

        await interaction.followUp({ embeds: [reportEmbed], components: [], ephemeral: true });
        if (outcomeKey === 'destroyed') {
          await maybeSendNews(
            interaction,
            regionConfig,
            encounter,
            outcomeKey,
            rewardResult,
            rareShipAwarded
          );
        }

        const resolvedSession = {
          ...clientManager.getExploreSession(numericID),
          stage: 'resolved',
          resolution: {
            timestamp: now,
            region: regionConfig.key,
            encounterId: encounter.id,
            outcome: outcomeKey,
            reward: rewardResult,
            rareShip: rareShipAwarded
          }
        };

        clientManager.setExploreSession(numericID, resolvedSession);
        resolutionComplete = true;
        setupComplete = true;
      } finally {
        if (!resolutionComplete) {
          clientManager.clearExploreSession(numericID);
        }
      }
    } finally {
      if (!setupComplete) {
        clientManager.clearExploreSession(numericID);
      }
    }
  }
};
