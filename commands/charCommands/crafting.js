const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data : new SlashCommandBuilder()
        .setName('crafting')
        .setDescription('View crafting cooldowns'),
    async execute(interaction) {
        try {
            const userID = interaction.user.tag;
            var replyEmbed = await char.craftingCooldowns(userID);
            await interaction.reply(({ embeds: [replyEmbed] }));
        } catch (error) {
            console.log(error);
            if (replyEmbed) {
                await interaction.reply(replyEmbed);
            }
        }
    },
};