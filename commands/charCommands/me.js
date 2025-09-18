const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('me')
		.setDescription('Show player character- only RP aspects'),
	async execute(interaction) {
                await interaction.deferReply();
                const numericID = interaction.user.id;

                (async () => {
            let replyEmbed = await char.me(String(numericID));
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply({ embeds: [replyEmbed] });
            }
                })()
        },
};