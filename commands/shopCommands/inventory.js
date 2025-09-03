const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
        data: new SlashCommandBuilder()
                .setName('inventory')
                .setDescription('Displays your inventory'),
        async execute(interaction) {
                await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
                // Immediately defer the reply so Discord doesn’t time out
                const inventoryEmbed = await shop.createInventoryEmbed(String(numericID));
                // Edit the deferred reply with the embed
                await interaction.editReply({ embeds: [inventoryEmbed] });
        },
};
