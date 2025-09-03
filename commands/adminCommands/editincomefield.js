const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('editincomefield')
        .setDescription('Edit a field of an income. Use /editincomemenu first to see the fields of an income')
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
        let newValue;
        if (interaction.options.getString('newvalue') == null) {
            return await interaction.reply('If you want to remove a field, please make the new value "DELETE" in all caps');
        } else {
            newValue = interaction.options.getString('newvalue');
        }
        if (newValue == 'DELETE') {
            newValue = "DELETEFIELD";
        }

        const numericID = interaction.user.id;
        let reply = await admin.editIncomeField(fieldNumber, String(numericID), newValue);
        if (typeof(reply) == 'string') {
            await interaction.reply(reply);
        } else {
            await interaction.reply({ embeds: [reply] });
        }
    }
};