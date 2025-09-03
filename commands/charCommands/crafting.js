const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data : new SlashCommandBuilder()
        .setName('crafting')
        .setDescription('View crafting cooldowns'),
    async execute(interaction) {
        try {
            const numericID = interaction.user.id;
            var replyEmbed = await char.craftingCooldowns(String(numericID));
            await interaction.reply(({ embeds: [replyEmbed] }));
        } catch (error) {
            if (process.env.DEBUG) console.log(error);
            if (replyEmbed) {
                await interaction.reply(replyEmbed);
            }
        }
    },
};
