const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incomes')
		.setDescription('Collect your daily incomes'),
	async execute(interaction) {
        const userID = interaction.user.tag;
		const numericID = interaction.user.id;
		var [replyEmbed, replyString] = await char.incomes(userID, numericID);
		await interaction.reply(({ embeds: [replyEmbed] }));
		if (replyString) {
			interaction.channel.send(replyString);
		}
	},
};