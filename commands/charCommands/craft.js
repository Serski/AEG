const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('craft')
		.setDescription('Craft a recipe')
		.addStringOption((option) =>
		option.setName('recipe')
			.setDescription('The recipe name')
			.setRequired(true)
		),
	execute(interaction) {
		const recipe = interaction.options.getString('recipe');

		(async () => {
            let reply = await char.craft(interaction.user, recipe, interaction.guild)
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
			// Call the useItem function from the Shop class
		})()
	},
};