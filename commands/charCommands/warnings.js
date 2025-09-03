//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Check warnings')
        .addUserOption(option => option.setName('player').setDescription('The player to check warnings of').setRequired(false)),
    async execute(interaction) {
        const numericID = interaction.user.id;
        const player = interaction.options.getUser('player')?.id || numericID;
        const response = await char.checkWarns(String(player));

        return interaction.reply(response);
    },
};