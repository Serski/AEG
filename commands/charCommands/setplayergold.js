const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setplayergold')
        .setDescription('Sets the gold of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addIntegerOption(option => option.setName('gold').setDescription('The amount of gold to set').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        const player = interaction.options.getUser('player').id;
        const gold = interaction.options.getInteger('gold');
        const response = await char.setPlayerGold(player, gold);

        if (response) {
            return interaction.editReply(`Set gold to ${gold} for ${player}`);
        } else {
            return interaction.editReply('Something went wrong');
        }
    },
};