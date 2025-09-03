const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bank')
		.setDescription('Show bank'),
	async execute(interaction) {
                const charID = interaction.user.id;
		await interaction.deferReply({ ephemeral: true });
		const replyEmbed = await char.bank(charID);
		if (typeof(replyEmbed) == 'string') {
			await interaction.editReply(replyEmbed);
		} else {
			await interaction.editReply({ embeds: [replyEmbed] });
		}
	},
};