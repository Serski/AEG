const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initresourceselectmenu')
		.setDescription('Initialize a resource select menu here')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		try {
            // Call the method with the channel object directly
            await admin.initResourceSelect(interaction.channel);
            await interaction.reply({ content: "Set! Select menu should appear just below this message", ephemeral: true });
        } catch (error) {
            console.error("Failed to initialize select menu:", error);
            await interaction.reply({ content: "Failed to set the select menu. Please try again.", ephemeral: true });
        }
	},
};