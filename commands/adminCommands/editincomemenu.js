const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

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
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const role = interaction.options.getString('income');
        const numericID = interaction.user.id;

        (async () => {
            //addIncome(roleID, incomeString)
            let reply = await admin.editIncomeMenu(role, String(numericID));
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    }
};