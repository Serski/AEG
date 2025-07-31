const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allincomes')
		.setDescription('List all incomes')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
        await interaction.deferReply();
		try {
            let reply = await admin.allIncomes(1);
            if (typeof(reply) == 'string') {
                await interaction.editReply(reply);
            } else {
                let [embed, rows] = reply;
                await interaction.editReply(({ embeds: [embed], components: rows}));
            }
        } catch (error) {
            console.error("Failed to get incomes", error);
            await interaction.editReply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
	},
};