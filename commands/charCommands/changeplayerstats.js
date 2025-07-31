const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changeplayerstats')
        .setDescription('Change stats of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addStringOption(option => option.setName('stat').setDescription('The stat to change').setRequired(true))
        .addIntegerOption(option => option.setName('value').setDescription('The value to change stat by').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        const player = interaction.options.getUser('player').toString();
        const stat = interaction.options.getString('stat');
        const value = interaction.options.getInteger('value');
        
        const response = await char.changePlayerStats(player, stat, value);

        if (response) {
            if (response == "Error: Player not found") {
                return interaction.reply(`Player not found`);
            }
            return interaction.reply(`Changed ${response} by ${value} for ${player}`);
        } else {
            return interaction.reply('Something went wrong');
        }
    },
};