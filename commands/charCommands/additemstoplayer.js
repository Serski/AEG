const { ensureAdminInteraction } = require('../../shared/interactionGuards');
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
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const player = interaction.options.getUser('player').id;
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');
        const response = await char.addItemToPlayer(player, item, amount);

        if (response == true) {
            return interaction.editReply(`Gave ${amount} ${item} to ${player}`);
        } else if (response == false || !response) {
            return interaction.editReply('Something went wrong');
        } else {
            return interaction.editReply(response);
        }
    },
};