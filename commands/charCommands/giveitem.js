//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveitem')
        .setDescription('Give items to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to give items to').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to give').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of items to give').setRequired(false)),
    async execute(interaction) {
        const playerGiving = interaction.user.toString();
        const player = interaction.options.getUser('player').toString();
        const item = interaction.options.getString('item');
        let amount = interaction.options.getInteger('amount');
        if (!amount) {
            amount = 1;
        }
        const response = await char.giveItemToPlayer(playerGiving, player, item, amount);

        if (response == true) {
            return interaction.reply(`Gave ${amount} ${item} to ${player}`);
        } else if (response == false || !response) {
            return interaction.reply('Something went wrong');
        } else {
            return interaction.reply(response);
        }
    },
};