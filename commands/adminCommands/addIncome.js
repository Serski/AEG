const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addincome')
        .setDescription('Add an income attached to a role')
        .setDefaultMemberPermissions(0)
        .addRoleOption((option) =>
            option.setName('role')
                .setDescription('The role name')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('income')
                .setDescription('The income value')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const income = interaction.options.getString('income');

        (async () => {
            //addIncome(roleID, incomeString)
            let reply = await admin.addIncome(role, income);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    }
};