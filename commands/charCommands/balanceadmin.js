const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balanceadmin')
		.setDescription('Show balance of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to show the balance of').setRequired(true))
        .setDefaultMemberPermissions(0),
        async execute(interaction) {
            if (!(await ensureAdminInteraction(interaction))) {
                return;
            }
                await interaction.deferReply({ flags: 64 });
                const charID = interaction.options.getUser('player').id;

		(async () => {
            let replyEmbed = await char.balance(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply({ embeds: [replyEmbed] });
            }
		})()
	},
};