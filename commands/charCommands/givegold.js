//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const clientManager = require('../../clientManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givegold')
        .setDescription('Give gold to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to give gold to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of gold to give').setRequired(true)),
    async execute(interaction) {
        const playerGiving = interaction.user.toString();
        const player = interaction.options.getUser('player').toString();
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