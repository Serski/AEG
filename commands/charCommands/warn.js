//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('player').setDescription('The player to warn').setRequired(true)),
    async execute(interaction) {
        const player = interaction.options.getUser('player').tag;
        const response = await char.warn(player);

        return interaction.reply(response);
    },
};