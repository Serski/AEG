const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editembedmenu')
        .setDescription('Edit an embed')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
            option.setName('embed')
                .setDescription('The embed to edit')
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
    async execute(interaction) {
        const role = interaction.options.getString('embed');
        const type = interaction.options.getString('type');

        (async () => {
            //addIncome(roleID, incomeString)
            let reply = await admin.editMapMenu(role, interaction.user.tag, type);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    }
};