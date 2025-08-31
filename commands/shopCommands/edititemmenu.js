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
        const itemName = interaction.options.getString('itemname');
        await interaction.deferReply();

        // shop.editItemMenu returns an array with the first element being the replyEmbed and the second element being the rows
        const reply = await shop.editItemMenu(itemName, 1, interaction.user.tag);
        if (typeof reply === 'string') {
            await interaction.editReply(reply);
        } else {
            const [replyEmbed, rows] = reply;
            await interaction.editReply({ embeds: [replyEmbed], components: [rows] });
        }
    },
};

