const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Show player stats'),
	execute(interaction) {
                const numericID = interaction.user.id;

                (async () => {
            let replyEmbed = await char.stats(String(numericID));
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply({ content: replyEmbed, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
            }
                })()
        },
};