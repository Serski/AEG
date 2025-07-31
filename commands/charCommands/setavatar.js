const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setavatar')
		.setDescription('Set character avatar')
		.addStringOption((option) =>
		option.setName('avatarurl')
			.setDescription('URL of your avatar')
			.setRequired(true)
		),
	execute(interaction) {
		const avatarURL = interaction.options.getString('avatarurl');
		const userID = interaction.user.tag;

		(async () => {
			let replyString = await char.setAvatar(avatarURL, userID)
			await interaction.reply(replyString);
		})()
	},
};