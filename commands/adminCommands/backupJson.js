const { SlashCommandBuilder } = require('discord.js');
const dbm = require('../../database-manager'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('backupjson')
		.setDescription('Backup the JSON files')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		await interaction.deferReply();
        try {
            await dbm.logData();
            await interaction.editReply("Successfully backed up data.");
        } catch (error) {
            console.error("Failed to backup data", error);
            await interaction.editReply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
        },
};