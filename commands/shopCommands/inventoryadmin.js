const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventoryadmin')
		.setDescription('Show the inventory of a user')
		.setDefaultMemberPermissions(0)
		.addUserOption((option) =>
			option.setName('user')
				.setDescription('The user to check inventory of')
				.setRequired(true)
		),
	async execute(interaction) {
        const userID = interaction.options.getUser('user').id;
		var replyEmbed = await shop.createInventoryEmbed(userID);
		await interaction.reply(({ embeds: [replyEmbed] }));
	},
};