const { ensureAdminInteraction } = require('../../shared/interactionGuards');
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
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const playerGiving = interaction.options.getUser('playergiving').id;
        const player = interaction.options.getUser('playergetting').id;
        const amount = interaction.options.getInteger('amount');
        const response = await char.giveGoldToPlayer(playerGiving, player, amount);

        if (response == true) {
            return interaction.editReply(`Gave ${clientManager.getEmoji("Gold")} ${amount} to ${player}`);
        } else if (response == false || !response) {
            return interaction.editReply('Something went wrong');
        } else {
            return interaction.editReply(response);
        }
    },
};