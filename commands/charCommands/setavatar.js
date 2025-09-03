const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setavatar')
		.setDescription('Set character avatar')
		.addStringOption((option) =>
		option.setName('avatarurl')
			.setDescription('URL of your avatar')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const avatarURL = interaction.options.getString('avatarurl');
                const numericID = interaction.user.id;

                (async () => {
                        let replyString = await char.setAvatar(avatarURL, String(numericID))
                        await interaction.editReply(replyString);
                })()
        },
};