const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Show balance'),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
                const replyEmbed = await char.balance(String(numericID));
                if (typeof(replyEmbed) == 'string') {
                        await interaction.editReply(replyEmbed);
                } else {
                        await interaction.editReply({ embeds: [replyEmbed] });
                }
	},
};
