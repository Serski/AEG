const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('me')
		.setDescription('Show player character- only RP aspects'),
	execute(interaction) {
                const numericID = interaction.user.id;

                (async () => {
            let replyEmbed = await char.me(String(numericID));
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
                })()
        },
};