const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('helpadmin')
		.setDescription('Help with admin commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command you want helped with')
                .setRequired(false)),
	async execute(interaction) {
		try {
            let command = interaction.options.getString('command');

            if (command == null) {
                let [embed, rows] = await admin.generalHelpMenu(1, true);
                await interaction.reply({ embeds: [embed], components: rows});
                return;
            } else {
                let replyEmbed = admin.commandHelp(command);
                if (replyEmbed == null) {
                    await interaction.reply({ content: "Command not found: if this command exists, contact Alex to add it to the help list", ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [replyEmbed] });
                }
                return;
            }
        } catch (error) {
            console.error("Failed to help:", error);
            await interaction.reply({ content: "Failed to help. Please try again.", ephemeral: true });
        }
	},
};