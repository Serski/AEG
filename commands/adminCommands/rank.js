const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('Show a rank.')
		.addStringOption((option) =>
		option.setName('rank')
			.setDescription('The rank name')
			.setRequired(true)
		),
	execute(interaction) {
		const rankName = interaction.options.getString('rank');

		(async () => {
            let returnEmbed = await admin.map(rankName, interaction.channelId, "rank");

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