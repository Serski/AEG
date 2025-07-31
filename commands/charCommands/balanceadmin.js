const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const dataGetters = require('../../dataGetters');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balanceadmin')
		.setDescription('Show balance of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to show the balance of').setRequired(true))
        .setDefaultMemberPermissions(0),
	async execute(interaction) {
		const charResponse = interaction.options.getUser('player').toString();
        const charNumeric = charResponse.substring(2, charResponse.length - 1);
		const charID = await dataGetters.getCharFromNumericID(charNumeric);

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