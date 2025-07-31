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
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');
        const numberItems = interaction.options.getInteger('numbertouse');

		(async () => {
            let reply = await char.useItem(itemName, interaction.user.tag, numberItems)
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
			// Call the useItem function from the Shop class
		})()
	},
};