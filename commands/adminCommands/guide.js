const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guide')
		.setDescription('Show a guide.')
		.addStringOption((option) =>
		option.setName('guide')
			.setDescription('The guide name')
			.setRequired(true)
		),
	execute(interaction) {
		const guideName = interaction.options.getString('guide');

		(async () => {
            let returnEmbed = await admin.map(guideName, interaction.channelId, "guide");

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