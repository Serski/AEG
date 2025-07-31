const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removeembed')
		.setDescription('Remove an embed. This is destructive and cannot be undone.')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('embed')
			.setDescription('The embed name')
			.setRequired(true)
		)
		.addStringOption(option =>
            option.setName('type')
                .setDescription('The type of embed')
                .setRequired(true)
                .addChoices(
                    {name: 'Map', value: 'map'},
                    {name: 'Lore', value: 'lore'},
                    {name: 'Rank', value: 'rank'},
                    {name: 'Guide', value: 'guide'})),
	execute(interaction) {
		const mapName = interaction.options.getString('embed');
		const type = interaction.options.getString('type');

		(async () => {
            let returnString = await admin.removeMap(mapName, type);

			if (returnString) {
				await interaction.reply(returnString);
			} else {
				let capitalType = type.charAt(0).toUpperCase() + type.slice(1);
				await interaction.reply(`${capitalType} '${mapName}' has been removed.`);
			}
			// Call the addItem function from the Shop class
		})()
	},
};