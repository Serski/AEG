const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data : new SlashCommandBuilder()
        .setName('crafting')
        .setDescription('View crafting cooldowns'),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        try {
            const numericID = interaction.user.id;
            var replyEmbed = await char.craftingCooldowns(String(numericID));
            await interaction.editReply(({ embeds: [replyEmbed] }));
        } catch (error) {
            if (process.env.DEBUG) console.log(error);
            if (replyEmbed) {
                await interaction.editReply(replyEmbed);
            }
        }
    },
};
