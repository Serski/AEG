const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incomes')
		.setDescription('Collect your daily incomes'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const numericID = interaction.user.id;
		const roles = interaction.member.roles.cache;
		const [replyEmbed, replyString] = await char.incomes(String(numericID), roles);
		await interaction.editReply({ embeds: [replyEmbed] });
		const followUpOptions = { ephemeral: true };
		if (replyString) {
			await interaction.followUp({ ...followUpOptions, content: replyString });
		}
	},
};
