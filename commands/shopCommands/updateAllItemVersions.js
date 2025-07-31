const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('updateallitemversions')
		.setDescription('Update the version of all items')
		.setDefaultMemberPermissions(0),
	execute(interaction) {
		(async () => {
			try {
				await interaction.deferReply();
				let response = await shop.updateAllItemVersions();
				console.log(response);  // Log the response for debugging
				await interaction.editReply({ content: response });
			} catch (error) {
				console.error('Failed to update item versions:', error);
				await interaction.reply({ content: 'Error updating item versions.', ephemeral: true });
			}
		})();
	},
};