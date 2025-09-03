const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
		.setDescription('List shop items'),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                // const itemListString = await shop.shop();
                // await interaction.editReply(itemListString);
               let [embed, rows] = await shop.createShopEmbed(1, interaction);
               await interaction.editReply({ embeds: [embed], components: rows });
	},
};
