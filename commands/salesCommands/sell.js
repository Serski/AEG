const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const marketplace = require('../../marketplace'); // Importing marketplace

//use marketplace.postSale to post a sale
module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item')
        .addStringOption((option) =>
            option.setName('itemname')
                .setDescription('The item name')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('quantity')
                .setDescription('The quantity of the item')
                .setMinValue(1)
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('price')
                .setDescription('The price of the item')
                .setMinValue(1)
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const itemName = interaction.options.getString('itemname');
        const quantity = interaction.options.getInteger('quantity');
        const price = interaction.options.getInteger('price');
        const numericID = interaction.user.id;

        const [reply] = await Promise.all([
            marketplace.postSale(quantity, itemName, price, String(numericID))
        ]);

        if (typeof reply === 'string') {
            await interaction.editReply(reply);
        } else {
            await interaction.editReply({ embeds: [reply] });
        }
    }
};
