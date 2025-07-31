const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balanceall')
		.setDescription('Show balance of all players')
        .setDefaultMemberPermissions(0),
	execute(interaction) {

		(async () => {
            let [replyEmbed, replyRows] = await char.balanceAll(1);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                //Has action rows
                await interaction.reply({ embeds: [replyEmbed], components: replyRows});
            }
		})()
	},
};