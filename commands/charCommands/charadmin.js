const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

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
            if (!(await ensureAdminInteraction(interaction))) {
                return;
            }
                await interaction.deferReply({ flags: 64 });
                const charID = interaction.options.getUser('character').id;

		(async () => {
            let replyEmbed = await char.char(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply({ embeds: [replyEmbed] });
            }
		})()
	},
};