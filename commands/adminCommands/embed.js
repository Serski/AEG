const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Show an embed')
		.setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of embed')
                .setRequired(true)
                .addChoices(
                    {name: 'Map', value: 'map'},
                    {name: 'Lore', value: 'lore'},
                    {name: 'Rank', value: 'rank'},
                    {name: 'Guide', value: 'guide'}))
        .addStringOption(option =>
            option.setName('embed')
                .setDescription('The name of the embed')
                .setRequired(true)),
	async execute(interaction) {
		try {
            let type = interaction.options.getString('type');
            let embed = interaction.options.getString('embed');
            let channelID = interaction.channelId;
            // Call the method with the channel object directly
            let reply = await admin.map(embed, channelID, type);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply]});
            }
        } catch (error) {
            console.error("Failed to add map menu:", error);
            await interaction.reply({ content: "Failed to add the map. Please try again.", ephemeral: true });
        }
	},
};