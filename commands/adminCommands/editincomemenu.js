const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editincomemenu')
        .setDescription('Edit an income')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
            option.setName('income')
                .setDescription('The income to edit')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getString('income');
        const numericID = interaction.user.id;

        (async () => {
            //addIncome(roleID, incomeString)
            let reply = await admin.editIncomeMenu(role, String(numericID));
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    }
};