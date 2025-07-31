// //ADMIN COMMAND
// const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
// const shop = require('../../shop'); // Importing shop

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('editshoplayout')
// 		.setDescription('Use "GENERAL" to edit whole shop layout, or a category name to edit that category')
// 		.setDefaultMemberPermissions(0)
// 		.addStringOption((option) =>
// 			option.setName('categoryname')
// 				.setDescription('Category name or GENERAL')
// 				.setRequired(true)
// 		),
// 	async execute(interaction) {
// 		let categoryName = interaction.options.getString('categoryname');
// 		let placeholders = await shop.editShopLayoutPlaceholders(categoryName);

// 		if (placeholders == "ERROR") {
// 			await interaction.reply("Error! That category does not exist.");
// 			return;
// 		}
// 		// Create the modal
// 		const modal = new ModalBuilder()
// 			.setCustomId('shoplayoutmodal')
// 			.setTitle('Set a custom shop layout');

// 		// Create the text input components
// 		const categoryToEditInput = new TextInputBuilder()
// 			.setCustomId('categorytoedit')
// 			.setLabel('CATEGORY name- or GENERAL replaces everything')
// 			.setValue(placeholders[0])
// 			.setStyle(TextInputStyle.Short);
		
// 		const layoutStringInput = new TextInputBuilder()
// 			.setCustomId('layoutstring')
// 			.setLabel('Only 1 category unless GENERAL. Format below')
// 			.setValue(placeholders[1])
// 			.setStyle(TextInputStyle.Paragraph);

// 		//Create action rows for each input
// 		const categoryActionRow = new ActionRowBuilder().addComponents(categoryToEditInput);
// 		const layoutActionRow = new ActionRowBuilder().addComponents(layoutStringInput);

// 		// Add the action rows to the modal
// 		modal.addComponents(categoryActionRow, layoutActionRow);

// 		// Show the modal to the user
// 		await interaction.showModal(modal);
// 	},
// };
