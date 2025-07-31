const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const char = require('../../char'); // Importing char

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editchar')
		.setDescription('Edit your character'),
	async execute(interaction) {
        placeholderArray = await char.editCharPlaceholders(interaction.user.tag);

		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('newcharmodal')
			.setTitle('Create a new character');

		// Create the text input components
		const charNameInput = new TextInputBuilder()
			.setCustomId('charname')
			.setLabel('Character Name')
            .setValue(placeholderArray[0])
			.setStyle(TextInputStyle.Short);

		const charBioInput = new TextInputBuilder()
			.setCustomId('charbio')
			.setLabel('Character Bio')
            .setValue(placeholderArray[1])
			.setStyle(TextInputStyle.Short);

		// Create action rows for each input
		const nameActionRow = new ActionRowBuilder().addComponents(charNameInput);
		const bioActionRow = new ActionRowBuilder().addComponents(charBioInput);

		// Add the action rows to the modal
		modal.addComponents(nameActionRow, bioActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	},
};
