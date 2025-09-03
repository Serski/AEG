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
            await interaction.deferReply({ flags: 64 });
        const recipe = interaction.options.getString('recipe');

        (async () => {
            let reply = await shop.inspectRecipe(recipe)
            if (typeof(reply) == 'string') {
                // Ephemeral reply
                await interaction.editReply({content: reply });
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    },
};