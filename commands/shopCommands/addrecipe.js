//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shop = require('../../shop');
//const shop = require('../../shop'); // Importing shop

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrecipe')
        .setDefaultMemberPermissions(0)
        .setDescription('Create a new recipe')
        .addStringOption(option => option.setName('recipename')
            .setDescription('The name of the recipe')
            .setRequired(false)),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        let recipeName = interaction.options.getString('recipename');
        if (!recipeName) {
            recipeName = 'New Recipe';
        }

        recipeName = await shop.addRecipe(recipeName);
        
        // Respons with an ephemeral message saying that recipe should appear below
        await interaction.editReply({ content: 'Edit recipe menu should appear below' });

        // Show the edit recipe menu
        const numericID = interaction.user.id;
        let reply = await shop.editRecipeMenu(recipeName, String(numericID));
        if (typeof(reply) == 'string') {
            await interaction.followUp(reply);
        } else {
            await interaction.followUp({ embeds: [reply]});
        }
    },
};
