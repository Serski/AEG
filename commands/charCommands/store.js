const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('store')
		.setDescription('Store an item to storage')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Item to store')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to store')
                .setRequired(true)),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await char.store(String(numericID), item, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply("Stored " + quantity + " " + item + " to storage");
            }
		})()
	},
};