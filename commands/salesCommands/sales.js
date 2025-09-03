const { SlashCommandBuilder } = require('discord.js');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales'),
    async execute(interaction) {
            await interaction.deferReply({ flags: 64 });
        const [embed, rows] = await marketplace.createSalesEmbed(1, interaction);
        await interaction.editReply({ embeds: [embed], components: rows });
    },
};

