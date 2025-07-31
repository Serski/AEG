//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
//const shop = require('../../shop'); // Importing shop

module.exports = {
	data: new SlashCommandBuilder()
		.setName('examplemodal')
		.setDescription('Example Modal')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('additemmodal')
			.setTitle('Add Item to Shop');

		// Create the text input components
		const gmInstructionInput = new TextInputBuilder()
			.setCustomId('gminstructions')
			.setLabel('GM Instructions')
			.setStyle(TextInputStyle.Short);
		
		const playerTemplateInput = new TextInputBuilder()
			.setCustomId('playertemplate')
			.setLabel('Player Template')
			.setStyle(TextInputStyle.Paragraph);

		// Create action rows for each input
		const gmInstructionActionRow = new ActionRowBuilder()
			.addComponents(gmInstructionInput);
		const playerTemplateActionRow = new ActionRowBuilder()
			.addComponents(playerTemplateInput);
	
		// Add the action rows to the modal
		modal.addComponents(gmInstructionActionRow, playerTemplateActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	},
};
