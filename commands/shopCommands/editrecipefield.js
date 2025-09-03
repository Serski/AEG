const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('editrecipefield')
        .setDescription('Edit a field of an recipe in the shop. Use /editrecipemenu first to see the fields of an recipe')
        .setDefaultMemberPermissions(0)
        .addIntegerOption((option) =>
            option.setName('fieldnumber')
                .setDescription('The field number')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('newvalue')
                .setDescription('The new value')
                .setRequired(false)
        ),
    async execute(interaction) {
        const fieldNumber = interaction.options.getInteger('fieldnumber');
        const newValue = interaction.options.getString('newvalue');
        const numericID = interaction.user.id;
        let reply = await shop.editRecipeField(numericID, fieldNumber, newValue);
        await interaction.reply(reply);
    }
};