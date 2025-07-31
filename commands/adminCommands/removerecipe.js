const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removerecipe')
		.setDescription('Delete a recipe. This is destructive and cannot be undone.')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('recipe')
			.setDescription('The recipe name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('recipe');

		(async () => {
            let returnString = await shop.removeRecipe(itemName);

			if (returnString) {
				await interaction.reply(returnString);
			} else {
				await interaction.reply(`Recipe '${itemName}' has been removed.`);
			}
			// Call the addItem function from the Shop class
		})()
	},
};