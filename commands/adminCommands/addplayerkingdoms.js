const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addplayerkingoms')
        .setDescription('Add a player kingdom to the list of kingdoms.')
        .addRoleOption(option => 
            option.setName('kingdom')
                .setDescription('The name of the kingdom to add.')
                .setRequired(true))
        .setDefaultMemberPermissions(0),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		try {
            const kingdom = interaction.options.getRole('kingdom');
            await admin.addKingdom(kingdom);
            await interaction.editReply({ content: `Added the kingdom ${kingdom} to the list of player kingdoms.` });
        } catch (error) {
            console.error("Failed to add map menu:", error);
            await interaction.editReply({ content: "Failed to add the kingdom. Please try again." });
        }
	},
};