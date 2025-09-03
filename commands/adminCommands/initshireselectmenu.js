const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initshireselectmenu')
		.setDescription("Initialize a kingdom's shire select menu here")
        .addStringOption((option) =>
            option.setName('name')
                .setDescription('The Kingdom name')
                .setRequired(true)
            )
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
		try {
            // Call the method with the channel object directly
            let response = await admin.initShireSelect(interaction.channel, interaction.options.getString('name'));
            if (response != "Select menu set!") {
                await interaction.editReply({ content: response });
                return;
            }
            await interaction.editReply({ content: "Set! Select menu should appear just below this message" });
        } catch (error) {
            console.error("Failed to initialize select menu:", error);
            await interaction.editReply({ content: "Failed to set the select menu. Please try again." });
        }
	},
};