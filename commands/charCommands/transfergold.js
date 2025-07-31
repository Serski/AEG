//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const clientManager = require('../../clientManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfergold')
        .setDescription('Transfer gold from a player to a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('playergiving').setDescription('The player giving gold').setRequired(true))
        .addUserOption(option => option.setName('playergetting').setDescription('The player to give gold to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of gold to give').setRequired(true)),
    async execute(interaction) {
        const playerGiving = interaction.options.getUser('playergiving').toString();
        const player = interaction.options.getUser('playergetting').toString();
        const amount = interaction.options.getInteger('amount');
        const response = await char.giveGoldToPlayer(playerGiving, player, amount);

        if (response == true) {
            return interaction.reply(`Gave ${clientManager.getEmoji("Gold")} ${amount} to ${player}`);
        } else if (response == false || !response) {
            return interaction.reply('Something went wrong');
        } else {
            return interaction.reply(response);
        }
    },
};