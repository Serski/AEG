const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
        data: new SlashCommandBuilder()
                .setName('storage')
                .setDescription('Show your storage'),
        async execute(interaction) {
                const numericID = interaction.user.id;
                await interaction.deferReply({ ephemeral: true });
                const replyEmbed = await shop.storage(String(numericID));
                await interaction.editReply({ embeds: [replyEmbed] });
        },
};
