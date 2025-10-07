const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const deploycommands = require('../../deploy-commands');
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploycommands')
    .setDefaultMemberPermissions(0)
    .setDescription('Deploy map commands'),
  async execute(interaction) {
      if (!(await ensureAdminInteraction(interaction))) {
          return;
      }
          await interaction.deferReply({ flags: 64 });
    deploycommands.loadCommands();
    await interaction.editReply('Command files have been generated.');
  },
};
