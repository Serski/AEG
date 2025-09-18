const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deposit')
		.setDescription('Deposit gold to bank')
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity to deposit')
                .setRequired(true)
                .setMinValue(1)),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const numericID = interaction.user.id;
        const quantity = interaction.options.getInteger('quantity');

                (async () => {
            let replyEmbed = await char.deposit(String(numericID), quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.editReply(replyEmbed);
            } else {
                await interaction.editReply("Deposited " + quantity + " gold to bank");
            }
		})()
	},
};