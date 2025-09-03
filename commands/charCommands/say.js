const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('say')
		.setDescription('Say something using your character')
		.addStringOption((option) =>
		option.setName('message')
			.setDescription('The message to send')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
        const message = interaction.options.getString('message');
        const numericID = interaction.user.id;

                (async () => {
            let reply = await char.say(String(numericID), message, interaction.channel)
            if (typeof(reply) == 'string') {
                await interaction.editReply({ content: reply });
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
	},
};