const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
        .setName('inspectrecipe')
        .setDescription('Inspect a recipe')
        .addStringOption((option) =>
            option.setName('recipe')
                .setDescription('The recipe name')
                .setRequired(true)
        ),
    async execute(interaction) {
        const recipe = interaction.options.getString('recipe');

        (async () => {
            let reply = await shop.inspectRecipe(recipe)
            if (typeof(reply) == 'string') {
                // Ephemeral reply
                await interaction.reply({content: reply, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    },
};