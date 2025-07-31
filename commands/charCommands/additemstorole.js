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
        const role = interaction.options.getRole('role');
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');

        const response = await char.addItemToRole(role, item, amount);
        console.log("response" + response);
        console.log(typeof response);

        if (typeof response == 'object') {
            console.log("here");
            if (response.length > 0) {
                return interaction.reply("Errors on the following characters: " + response.join(", "));
            } else {
                return interaction.reply(`Gave ${amount} ${item} to ${role}`);
            }
        } else {
            return interaction.reply(response);
        }
    },
};