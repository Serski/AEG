const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const { ensureAdminInteraction } = require('../../shared/interactionGuards');

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
        if (!(await ensureAdminInteraction(interaction))) {
            return;
        }
        await interaction.deferReply({ flags: 64 });
        const role = interaction.options.getRole('role');
        const income = interaction.options.getString('income');

        (async () => {
            //addIncome(roleID, incomeString)
            let reply = await admin.addIncome(role, income);
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                await interaction.editReply({ embeds: [reply] });
            }
            // Call the useItem function from the Shop class
        })()
    }
};