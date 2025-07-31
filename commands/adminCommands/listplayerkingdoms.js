const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayerkingdoms')
        .setDescription('List all kingdoms owned by a player')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            let reply = await admin.listKingdoms();
            //Reply is an embed
            if (typeof(reply) == 'string') {
                await interaction.reply({ content: reply, ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [reply] });
        } catch (error) {
            console.error("Failed to get player kingdoms", error);
            await interaction.reply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
    }
};
