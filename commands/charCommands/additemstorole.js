const { ensureAdminInteraction } = require('../../shared/interactionGuards');
//Admin command

const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additemstorole')
        .setDescription('Adds items to a role')
        .setDefaultMemberPermissions(0)
        .addRoleOption(option => option.setName('role').setDescription('The role to add items to').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to add').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of items to add').setRequired(true)),
    async execute(interaction) {
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const role = interaction.options.getRole('role');
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');

        const response = await char.addItemToRole(role, item, amount);
        if (process.env.DEBUG) console.log("response" + response);
        if (process.env.DEBUG) console.log(typeof response);

        if (typeof response == 'object') {
            if (process.env.DEBUG) console.log("here");
            if (response.length > 0) {
                return interaction.editReply("Errors on the following characters: " + response.join(", "));
            } else {
                return interaction.editReply(`Gave ${amount} ${item} to ${role}`);
            }
        } else {
            return interaction.editReply(response);
        }
    },
};
