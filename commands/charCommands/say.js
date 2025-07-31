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
	execute(interaction) {
        const message = interaction.options.getString('message');

		(async () => {
            let reply = await char.say(interaction.user.tag, message, interaction.channel)
            if (typeof(reply) == 'string') {
                await interaction.reply({ content: reply, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
	},
};