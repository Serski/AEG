const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allitems')
		.setDefaultMemberPermissions(0)
		.setDescription('List all items'),
	async execute(interaction) {
                // const itemListString = await shop.shop();
                // await interaction.reply(itemListString);
		let [embed, rows] = await shop.createAllItemsEmbed(1, interaction);
                if (process.env.DEBUG) console.log(rows);
		await interaction.reply({ embeds: [embed], components: rows});
	},
};
