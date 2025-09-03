const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('char')
		.setDescription('Show player character'),
	execute(interaction) {
                const numericID = interaction.user.id;

                (async () => {
            let replyEmbed = await char.char(String(numericID));
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};