const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initpartyselectmenus')
		.setDescription('Initialize the menus to join a party')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		try {
            // Call the method with the channel object directly
            await admin.initPartySelect(interaction.channel);
            await interaction.reply({ content: "Set! Select menus should appear just below this message", ephemeral: true });
        } catch (error) {
            console.error("Failed to initialize select menu:", error);
            await interaction.reply({ content: "Failed to set the select menus. Please try again.", ephemeral: true });
        }
	},
};