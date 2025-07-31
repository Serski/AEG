// //ADMIN COMMAND
// const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
// //const shop = require('../../shop'); // Importing shop

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('newshoplayout')
// 		.setDescription('Set a custom shop layout (Note- categories here will supersede previously set category)')
// 		.setDefaultMemberPermissions(0),
// 	async execute(interaction) {
// 		// Create the modal
// 		const modal = new ModalBuilder()
// 			.setCustomId('shoplayoutmodal')
// 			.setTitle('Set a custom shop layout');

// 		// Create the text input components
// 		const categoryToEditInput = new TextInputBuilder()
// 			.setCustomId('categorytoedit')
// 			.setLabel('CATEGORY name- or GENERAL replaces everything')
// 			.setStyle(TextInputStyle.Short);
		
// 		const layoutStringInput = new TextInputBuilder()
// 			.setCustomId('layoutstring')
// 			.setLabel('Only 1 category unless GENERAL. Format below')
// 			.setPlaceholder('**CATEGORY (same as above in 1-cat edit)**\nItem1;\nItem2;\n**CATEGORY2 (if GENERAL edit)**\nItem4;')
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
