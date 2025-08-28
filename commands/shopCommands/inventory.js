const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
        data: new SlashCommandBuilder()
                .setName('inventory')
                .setDescription('Displays your inventory'),
        async execute(interaction) {
                const userID = interaction.user.id;
                // Immediately defer the reply so Discord doesn’t time out
                await interaction.deferReply({ flags: 64 }); // 64 = Ephemeral
                const inventoryEmbed = await shop.createInventoryEmbed(userID);
                // Edit the deferred reply with the embed
                await interaction.editReply({ embeds: [inventoryEmbed] });
        },
};
