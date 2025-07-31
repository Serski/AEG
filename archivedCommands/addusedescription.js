//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
//const shop = require('../../shop'); // Importing shop

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addusedescription')
		.setDescription('Add a "/use" description for the item to pop up when used')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('addusedescriptionmodal')
			.setTitle('Add A "/use" description');

		// Create the text input components
		const itemNameInput = new TextInputBuilder()
			.setCustomId('itemname')
			.setLabel('Item Name')
			.setStyle(TextInputStyle.Short);

		const itemDescriptionInput = new TextInputBuilder()
			.setCustomId('itemdescription')
			.setLabel('Item description')
			.setStyle(TextInputStyle.Paragraph);

		//Create action rows for each input
		const nameActionRow = new ActionRowBuilder().addComponents(itemNameInput);
		const descriptionActionRow = new ActionRowBuilder().addComponents(itemDescriptionInput);

		// Add the action rows to the modal
		modal.addComponents(nameActionRow, descriptionActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	},
};
