const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embedlist')
		.setDescription('List all embeds of a type')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of embed')
                .setRequired(true)
                .addChoices(
                    {name: 'Map', value: 'map'},
                    {name: 'Lore', value: 'lore'},
                    {name: 'Rank', value: 'rank'},
                    {name: 'Guide', value: 'guide'}))
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
        await interaction.deferReply();
		try {
            let reply;
            switch (interaction.options.getString('type')) {
                case 'map':
                    reply = await admin.allMaps();
                    break;
                case 'lore':
                    reply = await admin.allLores();
                    break;
                case 'rank':
                    reply = await admin.allRanks();
                    break;
                case 'guide':
                    reply = await admin.allGuides();
                    break;
                default:
                    reply = "Invalid type";
            }
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                let embed = reply;
                await interaction.editReply(({ embeds: [embed]}));
            }
        } catch (error) {
            console.error("Failed to get incomes", error);
            await interaction.editReply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
	},
};