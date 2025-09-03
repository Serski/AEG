const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allrecipes')
		.setDescription('List all recipes'),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
        reply = await shop.recipesEmbed(!interaction.member.permissions.has(PermissionFlagsBits.Administrator), 1);
        if (typeof(reply) == 'string') {
            await interaction.editReply(reply);
            return;
        }
        else {
            let [embed, rows] = reply;
            await interaction.editReply({ embeds: [reply[0]], components: [reply[1]]});
        }
	},
};