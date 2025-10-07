const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removeitem')
		.setDescription('Delete an item. This is destructive and cannot be undone.')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	async execute(interaction) {
	    if (!(await ensureAdminInteraction(interaction))) {
	        return;
	    }
	        await interaction.deferReply({ flags: 64 });
		const itemName = interaction.options.getString('itemname');

		(async () => {
			let returnString = await shop.removeItem(itemName);

			if (returnString) {
				await interaction.editReply(returnString);
			} else {
				await interaction.editReply(`Item '${itemName}' has been removed from the shop.`);
			}
			// Call the addItem function from the Shop class
		})()
	},
};