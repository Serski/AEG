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
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		const recipe = interaction.options.getString('recipe');

		(async () => {
            let reply = await char.craft(interaction.user, recipe, interaction.guild)
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
			// Call the useItem function from the Shop class
		})()
	},
};