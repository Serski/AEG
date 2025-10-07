const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('updateallitemversions')
		.setDescription('Update the version of all items')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
	    if (!(await ensureAdminInteraction(interaction))) {
	        return;
	    }
	        await interaction.deferReply({ flags: 64 });
		(async () => {
			try {
				let response = await shop.updateAllItemVersions();
                                if (process.env.DEBUG) console.log(response);  // Log the response for debugging
				await interaction.editReply({ content: response });
			} catch (error) {
				console.error('Failed to update item versions:', error);
				await interaction.editReply({ content: 'Error updating item versions.' });
			}
		})();
	},
};
