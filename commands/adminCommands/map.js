const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('map')
		.setDescription('Show a map.')
		.addStringOption((option) =>
		option.setName('map')
			.setDescription('The map name')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		const mapName = interaction.options.getString('map');

		(async () => {
            let returnEmbed = await admin.map(mapName, interaction.channelId);

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