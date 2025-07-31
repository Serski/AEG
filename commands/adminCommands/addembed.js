const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addembed')
		.setDescription('Add a embed')
		.setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName('embed')
                .setDescription('The name of the embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of embed')
                .setRequired(true)
                .addChoices(
                    {name: 'Map', value: 'map'},
                    {name: 'Lore', value: 'lore'},
                    {name: 'Rank', value: 'rank'},
                    {name: 'Guide', value: 'guide'})),
	async execute(interaction) {
		try {
            let map = interaction.options.getString('embed');
            let type = interaction.options.getString('type');
            let guild = interaction.guild;
            // Call the method with the channel object directly
            map = await admin.addMap(map, guild, type);
            
            // Respons with an ephemeral message saying that map should appear below
            await interaction.reply({ content: 'Embed menu should appear below', ephemeral: true });

            // Show the map menu
            let reply = await admin.editMapMenu(map, interaction.user.tag, type);
            if (typeof(reply) == 'string') {
                await interaction.followUp(reply);
            } else {
                await interaction.followUp({ embeds: [reply]});
            }
        } catch (error) {
            console.error("Failed to add map menu:", error);
            await interaction.reply({ content: "Failed to add the map. Please try again.", ephemeral: true });
        }
	},
};