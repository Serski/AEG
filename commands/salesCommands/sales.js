const { SlashCommandBuilder } = require('discord.js');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales'),
    async execute(interaction) {
        let [embed, rows] = await marketplace.createSalesEmbed(1, interaction);
        await interaction.reply({ embeds: [embed], components: rows});
    },
};