const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Show balance'),
	async execute(interaction) {
                const charID = interaction.user.id;

		await interaction.deferReply({ ephemeral: true });

		const replyEmbed = await char.balance(charID);
		if (typeof(replyEmbed) == 'string') {
			await interaction.editReply(replyEmbed);
		} else {
			await interaction.editReply({ embeds: [replyEmbed] });
		}
	},
};
