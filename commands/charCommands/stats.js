const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Show player stats'),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;

                (async () => {
            let replyEmbed = await char.stats(String(numericID));
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply({ content: replyEmbed });
            } else {
                await interaction.editReply({ embeds: [replyEmbed] });
            }
                })()
        },
};