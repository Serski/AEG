const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const dataGetters = require('../../dataGetters');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('charadmin')
		.setDescription('Show any player character')
		.setDefaultMemberPermissions(0)
		.addUserOption((option) =>
			option.setName('character')
				.setDescription('The character to check')
				.setRequired(true)
		),
	async execute(interaction) {
		const charResponse = interaction.options.getUser('character').toString();
		//char is a string starting with <@ and ending with >
		const charNumeric = charResponse.substring(2, charResponse.length - 1);
		const charID = await dataGetters.getCharFromNumericID(charNumeric);

		(async () => {
            let replyEmbed = await char.char(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};