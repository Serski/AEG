const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initclassselectmenu')
		.setDescription('Initialize a class select menu here')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		try {
            // Call the method with the channel object directly
            await admin.initClassSelect(interaction.channel);
            await interaction.editReply({ content: "Set! Select menu should appear just below this message" });
        } catch (error) {
            console.error("Failed to initialize select menu:", error);
            await interaction.editReply({ content: "Failed to set the select menu. Please try again." });
        }
	},
};