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
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
        const quantity = interaction.options.getInteger('quantity');

                (async () => {
            let replyEmbed = await char.withdraw(String(numericID), quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply("Withdrew " + quantity + " gold from bank");
            }
		})()
	},
};