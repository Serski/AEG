const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addplayergold')
        .setDescription('Add gold to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addIntegerOption(option => option.setName('gold').setDescription('The amount of gold to set').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const player = interaction.options.getUser('player').id;
        const gold = interaction.options.getInteger('gold');
        const response = await char.addPlayerGold(player, gold);

        if (response) {
            //make below ephemeral
            return interaction.editReply({ content: `Added ${gold} to ${player}` });
        } else {
            return interaction.editReply('Something went wrong');
        }
    },
};