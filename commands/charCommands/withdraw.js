const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('withdraw')
		.setDescription('Withdraw gold from bank')
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to withdraw')
                .setRequired(true)),
	execute(interaction) {
		const charID = interaction.user.tag;
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await char.withdraw(charID, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply("Withdrew " + quantity + " gold from bank");
            }
		})()
	},
};