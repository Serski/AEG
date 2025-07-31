const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('editembedfield')
        .setDescription('Edit a field of an embed. Use /editembedmenu first to see the fields of the embed')
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
            newValue = "";
        } else {
            newValue = interaction.options.getString('newvalue');
        }

        let reply = await admin.editMapField(interaction.user.tag, fieldNumber, newValue);
        if (typeof(reply) == 'string') {
            await interaction.reply(reply);
        } else {
            await interaction.reply({ embeds: [reply] });
        }
    }
};