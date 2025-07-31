const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show your inventory'),
	async execute(interaction) {
        const userID = interaction.user.id;
		var replyEmbed = await shop.createInventoryEmbed(userID);
		await interaction.reply(({ embeds: [replyEmbed] }));
	},
};