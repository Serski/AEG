const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lore')
		.setDescription('Show a lore.')
		.addStringOption((option) =>
		option.setName('lore')
			.setDescription('The lore name')
			.setRequired(true)
		),
        async execute(interaction) {
                if (!(await ensureAdminInteraction(interaction))) {
                        return;
                }
                await interaction.deferReply({ flags: 64 });
		const loreName = interaction.options.getString('lore');

		(async () => {
            let returnEmbed = await admin.map(loreName, interaction.channelId, "lore");

			// If the return is a string, it's an error message
            if (typeof(returnEmbed) == 'string') {
                // If it's a string, it's an error message, ephemeral it
                await interaction.editReply({content: returnEmbed });
            } else {
                await interaction.editReply({ embeds: [returnEmbed] });
            }
			// Call the addItem function from the Shop class
		})()
	},
};