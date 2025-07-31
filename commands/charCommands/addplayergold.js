const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addplayergold')
        .setDescription('Add gold to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addIntegerOption(option => option.setName('gold').setDescription('The amount of gold to set').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        const player = interaction.options.getUser('player').toString();
        const gold = interaction.options.getInteger('gold');
        const response = await char.addPlayerGold(player, gold);

        if (response) {
            //make below ephemeral
            return interaction.reply({ content: `Added ${gold} to ${player}`, ephemeral: true });
        } else {
            return interaction.reply('Something went wrong');
        }
    },
};