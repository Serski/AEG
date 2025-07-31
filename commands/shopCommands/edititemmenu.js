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
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');

		(async () => {
			//shop.editItemMenu returns an array with the first element being the replyEmbed and the second element being the rows
			let reply = await shop.editItemMenu(itemName, 1, interaction.user.tag);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
				let replyEmbed = reply[0];
				let rows = reply[1];
                await interaction.reply({ embeds: [replyEmbed], components: [rows]});
            }
		})()
	},
};