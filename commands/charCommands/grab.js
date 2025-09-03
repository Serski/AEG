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
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await char.grab(String(numericID), item, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply("Grabbed " + quantity + " " + item + " from storage");
            }
		})()
	},
};