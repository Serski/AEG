const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('grab')
		.setDescription('Grab an item from storage')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Item to grab')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to grab')
                .setRequired(true)),
	execute(interaction) {
		const charID = interaction.user.tag;
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await char.grab(charID, item, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply("Grabbed " + quantity + " " + item + " from storage");
            }
		})()
	},
};