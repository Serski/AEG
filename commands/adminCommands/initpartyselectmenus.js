const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initpartyselectmenus')
		.setDescription('Initialize the menus to join a party')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
	    if (!(await ensureAdminInteraction(interaction))) {
	        return;
	    }
	        await interaction.deferReply({ flags: 64 });
		try {
            // Call the method with the channel object directly
            await admin.initPartySelect(interaction.channel);
            await interaction.editReply({ content: "Set! Select menus should appear just below this message" });
        } catch (error) {
            console.error("Failed to initialize select menu:", error);
            await interaction.editReply({ content: "Failed to set the select menus. Please try again." });
        }
	},
};