const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edititemmenu')
        .setDescription('Show the edit item menu')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
            option.setName('itemname')
                .setDescription('The item name')
                .setRequired(true)
        ),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        const itemName = interaction.options.getString('itemname');
        const numericID = interaction.user.id;
        const reply = await shop.editItemMenu(itemName, 1, String(numericID));
        if (typeof reply === 'string') {
            await interaction.editReply(reply);
        } else {
            const [replyEmbed, rows] = reply;
            await interaction.editReply({ embeds: [replyEmbed], components: [rows] });
        }
    },
};

