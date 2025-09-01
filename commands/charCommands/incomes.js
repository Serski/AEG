const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incomes')
		.setDescription('Collect your daily incomes'),
        async execute(interaction) {
                const userID = interaction.user.tag;
                const numericID = interaction.user.id;

                await interaction.deferReply({ ephemeral: true });

                const [replyEmbed, replyString] = await char.incomes(userID, numericID);
                await interaction.editReply({ embeds: [replyEmbed] });
                if (replyString) {
                        await interaction.followUp({ content: replyString, ephemeral: true });
                }
        },
};
