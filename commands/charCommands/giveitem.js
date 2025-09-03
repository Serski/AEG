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
            await interaction.deferReply({ flags: 64 });
        const numericID = interaction.user.id;
        const player = interaction.options.getUser('player').id;
        const item = interaction.options.getString('item');
        let amount = interaction.options.getInteger('amount');
        if (!amount) {
            amount = 1;
        }
        const response = await char.giveItemToPlayer(String(numericID), String(player), item, amount);

        if (response == true) {
            return interaction.editReply(`Gave ${amount} ${item} to ${player}`);
        } else if (response == false || !response) {
            return interaction.editReply('Something went wrong');
        } else {
            return interaction.editReply(response);
        }
    },
};