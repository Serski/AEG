const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balanceall')
		.setDescription('Show balance of all players')
        .setDefaultMemberPermissions(0),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });

		(async () => {
            let [replyEmbed, replyRows] = await char.balanceAll(1);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                //Has action rows
                await interaction.editReply({ embeds: [replyEmbed], components: replyRows});
            }
		})()
	},
};