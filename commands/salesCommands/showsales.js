//Passes saleID to inspectSale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showsales')
        .setDescription('Show a players sales')
        .addUserOption((option) =>
            option.setName('player')
                .setDescription('Player to show sales for')
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
        ),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        let seller = interaction.options.getUser('player');
        let page = interaction.options.getInteger('page');
        if (process.env.DEBUG) console.log(seller);
        if (!seller) {
            seller = interaction.user;
        }
        if (!page) {
            page = 1;
        }

        const sellerID = seller.id;

        let replyString = await marketplace.showSales(sellerID, page);
        //if embed, display embed, otherwise display string
        if (typeof (replyString) == 'string') {
            await interaction.editReply(replyString);
        } else {
            await interaction.editReply({ embeds: [replyString] });
        }
    },
};
