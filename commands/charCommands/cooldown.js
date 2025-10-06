const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const char = require('../../char');
const { COOLDOWN_MS: EXPLORE_COOLDOWN_MS } = require('../shared/explore-data');

const RAID_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const HARVEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const TRADE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const INCOMES_COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cooldown')
        .setDescription('Check your active timers (item usage and missions).'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const numericID = interaction.user.id;
        const [, charData] = await char.findPlayerData(String(numericID));

        if (!charData) {
            await interaction.editReply("You haven't made a character yet! Use /newchar first.");
            return;
        }

        const fields = [];
        const nowMs = Date.now();
        const nowSeconds = Math.round(nowMs / 1000);

        if (charData.cooldowns && charData.cooldowns.usageCooldowns) {
            const usageLines = [];
            for (const [itemName, timestamp] of Object.entries(charData.cooldowns.usageCooldowns)) {
                const numericTimestamp = Number(timestamp);
                if (numericTimestamp > nowSeconds) {
                    usageLines.push(`**${itemName}**: <t:${numericTimestamp}:R>`);
                }
            }

            if (usageLines.length > 0) {
                fields.push({ name: 'Item Cooldowns', value: usageLines.join('\n') });
            }
        }

        const missionLines = [];
        const addMissionLine = (label, timestamp, cooldownMs) => {
            if (!timestamp) {
                return;
            }

            const numericTimestamp = Number(timestamp);
            if (!Number.isFinite(numericTimestamp)) {
                return;
            }

            const expiry = numericTimestamp + cooldownMs;
            if (expiry > nowMs) {
                missionLines.push(`**${label}**: <t:${Math.round(expiry / 1000)}:R>`);
            }
        };

        addMissionLine('Raid', charData.lastRaidAt, RAID_COOLDOWN_MS);
        addMissionLine('Harvest', charData.lastHarvestAt, HARVEST_COOLDOWN_MS);
        addMissionLine('Mine', charData.lastMineAt, MINE_COOLDOWN_MS);
        addMissionLine('Trade', charData.lastTradeAt, TRADE_COOLDOWN_MS);
        addMissionLine('Explore', charData.lastExploreAt, EXPLORE_COOLDOWN_MS);
        addMissionLine('Incomes', charData.lastIncomesAt, INCOMES_COOLDOWN_MS);

        if (missionLines.length > 0) {
            fields.push({ name: 'Mission Cooldowns', value: missionLines.join('\n') });
        }

        if (fields.length === 0) {
            fields.push({ name: 'Cooldowns', value: 'No active cooldowns' });
        }

        const embed = new EmbedBuilder()
            .setColor(0x36393e)
            .setAuthor({
                name: charData.name,
                iconURL: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/1393917452731289680/1411714755042869268/AEGIR_SMALL_copy.png?ex=68b5a951&is=68b457d1&hm=36aea50e9270da5b5b7d65cf9364ce946e1a05ebc2aa0ed44bf76e80470673f2',
            })
            .setTitle('Current Cooldowns')
            .addFields(fields);

        await interaction.editReply({ embeds: [embed] });
    },
};
