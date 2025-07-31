const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const deploycommands = require('../../deploy-commands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploycommands')
    .setDefaultMemberPermissions(0)
    .setDescription('Deploy map commands'),
  async execute(interaction) {
    deploycommands.loadCommands();
    await interaction.reply('Command files have been generated.');
  },
};
