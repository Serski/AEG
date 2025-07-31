//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additemstoplayer')
        .setDescription('Adds items to a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('player').setDescription('The player to add items to').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to add').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of items to add').setRequired(true)),
    async execute(interaction) {
        const player = interaction.options.getUser('player').toString();
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');
        const response = await char.addItemToPlayer(player, item, amount);

        if (response == true) {
            return interaction.reply(`Gave ${amount} ${item} to ${player}`);
        } else if (response == false || !response) {
            return interaction.reply('Something went wrong');
        } else {
            return interaction.reply(response);
        }
    },
};