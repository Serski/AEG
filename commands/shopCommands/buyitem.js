const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buyitem')
		.setDescription('Buy an item')
        .addIntegerOption((option) => 
        option.setName('numbertobuy')
			.setDescription('How many do you want to buy')
			.setRequired(true)
		)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
        const itemName = interaction.options.getString('itemname');
        const numberItems = interaction.options.getInteger('numbertobuy');
        const numericID = interaction.user.id;

                (async () => {
            let reply = await shop.buyItem(itemName, String(numericID), numberItems, interaction.channelId)
            interaction.editReply(reply);
                        // Call the addItem function from the Shop class
                })()
        },
};