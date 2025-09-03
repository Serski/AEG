const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balanceadmin')
		.setDescription('Show balance of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to show the balance of').setRequired(true))
        .setDefaultMemberPermissions(0),
        async execute(interaction) {
                const charID = interaction.options.getUser('player').id;

		(async () => {
            let replyEmbed = await char.balance(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};