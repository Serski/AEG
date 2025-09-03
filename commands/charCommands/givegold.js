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
            await interaction.deferReply({ flags: 64 });
        const numericID = interaction.user.id;
        const player = interaction.options.getUser('player').id;
        const amount = interaction.options.getInteger('amount');
        const response = await char.giveGoldToPlayer(String(numericID), String(player), amount);

        if (response == true) {
            return interaction.editReply(`Gave ${clientManager.getEmoji("Gold")} ${amount} to ${player}`);
        } else if (response == false || !response) {
            return interaction.editReply('Something went wrong');
        } else {
            return interaction.editReply(response);
        }
    },
};