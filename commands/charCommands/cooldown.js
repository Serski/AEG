const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const char = require('../../char');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cooldown')
        .setDescription('Check your active timers (item usage and crafting).'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const numericID = interaction.user.id;
        const [, charData] = await char.findPlayerData(String(numericID));

        if (!charData) {
            await interaction.editReply("You haven't made a character yet! Use /newchar first.");
            return;
        }

        const fields = [];
        const now = Math.round(Date.now() / 1000);

        if (charData.cooldowns && charData.cooldowns.usageCooldowns) {
            const usageLines = [];
            for (const [itemName, timestamp] of Object.entries(charData.cooldowns.usageCooldowns)) {
                const numericTimestamp = Number(timestamp);
                if (numericTimestamp > now) {
                    usageLines.push(`**${itemName}**: <t:${numericTimestamp}:R>`);
                }
            }

            if (usageLines.length > 0) {
                fields.push({ name: 'Item Cooldowns', value: usageLines.join('\n') });
            }
        }

        let craftingResult;
        try {
            craftingResult = await char.craftingCooldowns(String(numericID));
        } catch (error) {
            if (process.env.DEBUG) console.log(error);
        }

        if (typeof craftingResult === 'string') {
            fields.push({ name: 'Crafting', value: craftingResult });
        } else if (craftingResult && craftingResult.data && Array.isArray(craftingResult.data.fields)) {
            for (const field of craftingResult.data.fields) {
                if (field && field.name && field.value) {
                    fields.push({ name: field.name, value: field.value });
                }
            }
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
