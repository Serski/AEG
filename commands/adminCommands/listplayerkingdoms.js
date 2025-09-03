const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayerkingdoms')
        .setDescription('List all kingdoms owned by a player')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        try {
            let reply = await admin.listKingdoms();
            //Reply is an embed
            if (typeof(reply) == 'string') {
                await interaction.editReply({ content: reply });
                return;
            }
            await interaction.editReply({ embeds: [reply] });
        } catch (error) {
            console.error("Failed to get player kingdoms", error);
            await interaction.editReply({ content: "An error was caught. Contact Alex." });
        }
    }
};
