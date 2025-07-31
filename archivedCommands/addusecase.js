//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
//const shop = require('../../shop'); // Importing shop

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addusecase')
		.setDescription('Add a "/use" case for the item')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('addusecasemodal')
			.setTitle('Add A "/use" case');

		// Create the text input components
		const itemNameInput = new TextInputBuilder()
			.setCustomId('itemname')
			.setLabel('Item Name')
			.setStyle(TextInputStyle.Short);
		
		const itemUseTypeInput = new TextInputBuilder()
			.setCustomId('itemusetype')
			.setLabel('Use type- INCOMEROLE or STATBOOST')
			.setPlaceholder('Must be all caps, one word')
			.setStyle(TextInputStyle.Short);

		const itemGivesInput = new TextInputBuilder()
			.setCustomId('itemgives')
			.setLabel('What exactly does using this item give?')
			.setPlaceholder('(ROLE/STAT):(DAILYINCOME/NUMBER);')
			.setStyle(TextInputStyle.Short);

		const itemTakesInput = new TextInputBuilder()
			.setCustomId('itemtakes')
			.setLabel('What does using this item take? (Optional)')
			.setPlaceholder('(ITEM/STAT):(AMOUNT/NUMBER);\n(ITEM2/STAT2):(AMOUNT2/NUMBER2);')
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph);

		const itemCountdownInput = new TextInputBuilder()
			.setCustomId('itemcountdown')
			.setLabel('Usage cooldown in hours (Optional)')
			.setRequired(false)
			.setStyle(TextInputStyle.Short);

		//Create action rows for each input
		const nameActionRow = new ActionRowBuilder().addComponents(itemNameInput);
		const useTypeActionRow = new ActionRowBuilder().addComponents(itemUseTypeInput);
		const givesActionRow = new ActionRowBuilder().addComponents(itemGivesInput);
		const takesActionRow = new ActionRowBuilder().addComponents(itemTakesInput);
		const countdownActionRow = new ActionRowBuilder().addComponents(itemCountdownInput);

		// Add the action rows to the modal
		modal.addComponents(nameActionRow, useTypeActionRow, givesActionRow, takesActionRow, countdownActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	},
};
