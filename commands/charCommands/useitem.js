const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('useitem')
		.setDescription('Use an item')
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		)
		.addIntegerOption((option) => 
        option.setName('numbertouse')
			.setDescription('How many do you want to buy (Leave blank for 1)')
			.setRequired(false)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const itemName = interaction.options.getString('itemname');
        const numberItems = interaction.options.getInteger('numbertouse');
        const numericID = interaction.user.id;

                (async () => {
            let reply = await char.useItem(itemName, String(numericID), numberItems)
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
                        // Call the useItem function from the Shop class
                })()
        },
};