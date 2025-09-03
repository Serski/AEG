const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allitems')
		.setDefaultMemberPermissions(0)
		.setDescription('List all items'),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                // const itemListString = await shop.shop();
                // await interaction.editReply(itemListString);
		let [embed, rows] = await shop.createAllItemsEmbed(1, interaction);
                if (process.env.DEBUG) console.log(rows);
		await interaction.editReply({ embeds: [embed], components: rows});
	},
};
