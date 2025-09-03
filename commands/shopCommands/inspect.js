const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspect')
		.setDescription('Inspect an item')
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		const itemName = interaction.options.getString('itemname');

		(async () => {
            let replyEmbed = await shop.inspect(itemName);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply({content: replyEmbed });
            } else {
                await interaction.editReply({ embeds: [replyEmbed] });
            }
                })()
        },
};
