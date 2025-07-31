const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('updateitemversion')
		.setDescription('Update the version of an item in the shop to new attributes')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');

		(async () => {
			//shop.editItemMenu returns an array with the first element being the replyEmbed and the second element being the rows
			let reply = await shop.updateItemVersion(itemName);
            interaction.reply(reply);
		})()
	},
};