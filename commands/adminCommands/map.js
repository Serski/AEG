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
	execute(interaction) {
		const mapName = interaction.options.getString('map');

		(async () => {
            let returnEmbed = await admin.map(mapName, interaction.channelId);

			// If the return is a string, it's an error message
            if (typeof(returnEmbed) == 'string') {
                // If it's a string, it's an error message, ephemeral it
                await interaction.reply({content: returnEmbed, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [returnEmbed] });
            }
			// Call the addItem function from the Shop class
		})()
	},
};