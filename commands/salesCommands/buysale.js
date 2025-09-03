//Passes saleID and buyerID to buySale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buysale')
        .setDescription('Buy a sale')
        .addStringOption((option) =>
            option.setName('saleid')
                .setDescription('ID of sale to buy')
                .setRequired(true)
        ),
    async execute(interaction) {
        const saleID = interaction.options.getString('saleid');
        const buyerID = interaction.user.id;
        let replyString = await marketplace.buySale(saleID, buyerID);
        //if embed, display embed, otherwise display string
        if (typeof (replyString) == 'string') {
            await interaction.reply(replyString);
        } else {
            await interaction.reply({ embeds: [replyString] });
        }
    },
};
