const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('renamecategory')
		.setDescription('Rename a category')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('category')
			.setDescription('The category to rename')
			.setRequired(true)
		)
        .addStringOption((option) =>
        option.setName('newcategory')
            .setDescription('The new name of the category')
            .setRequired(true)
        ),
	execute(interaction) {
        const category = interaction.options.getString('category');
        const newCategory = interaction.options.getString('newcategory');
		(async () => {
			reply = await shop.renameCategory(category, newCategory);
            await interaction.reply(reply);
		})()
	},
};