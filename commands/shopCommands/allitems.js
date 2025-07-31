const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allitems')
		.setDefaultMemberPermissions(0)
		.setDescription('List all items'),
	async execute(interaction) {
		// const itemListString = await shop.shop();
		// console.log("DATA");
		// console.log(itemListString);
		// await interaction.reply(itemListString);
		let [embed, rows] = await shop.createAllItemsEmbed(1, interaction);
		console.log(rows);
		await interaction.reply({ embeds: [embed], components: rows});
	},
};