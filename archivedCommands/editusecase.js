//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shop = require('../shop'); // Importing shop
//Edits use case for item. Has default values with current values of use case and such. Based off of:

// static async editUseCasePlaceholders(itemName) {
//     itemName = await this.findItemName(itemName);
//     let data = dbm.load('shop.json');
//     if (!data[itemName].usageCase) {
//       return "ERROR! DOES NOT ALREADY HAVE A USE CASE. USE /addusecase FIRST"
//     }
//     let returnArray = [];
//     returnArray[0] = itemName;
//     returnArray[1] = data[itemName].usageCase.useType;
//     let givesString = "";
//     for (let key in data[itemName].usageCase.gives) {
//       givesString += (key + ":" + data[itemName].usageCase.gives[key] + ";");
//     }
//     returnArray[2] = givesString;
//     if (data[itemName].usageCase.takes) {
//       let takesString = "";
//       for (let key in data[itemName].usageCase.takes) {
//         takesString += (key + ":" + data[itemName].usageCase.takes[key] + ";");
//       }
//       returnArray[3] = takesString;
//     } else {
//       returnArray[3] = "";
//     }
//     if (data[itemName].usageCase.countdown) {
//       returnArray[4] = data[itemName].usageCase.countdown / 3600;
//     } else {
//       returnArray[4] = "";
//     }
//     return returnArray;
//   }

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editusecase')
		.setDescription('Edit use case for item')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
			option.setName('itemname')
				.setDescription('The item name')
				.setRequired(true)
		),
	async execute(interaction) {
		let itemName = interaction.options.getString('itemname');
		//Get default values from shop.editUseCasePlaceholders
		const arrayPlaceholders = await shop.editUseCasePlaceholders(itemName);
		itemName = arrayPlaceholders[0];
		const itemUseType = arrayPlaceholders[1];
		const itemGives = arrayPlaceholders[2];
		const itemTakes = arrayPlaceholders[3];
		const itemCountdownHours = arrayPlaceholders[4];

		// Create a new modal
		const modal = new ModalBuilder()
			.setCustomId('addusecasemodal')
			.setTitle('Add A "/use" case');

		const itemNameInput = new TextInputBuilder()
			.setCustomId('itemname')
			.setLabel('Item Name')
			.setValue(itemName)
			.setStyle(TextInputStyle.Short);
		
		const itemUseTypeInput = new TextInputBuilder()
			.setCustomId('itemusetype')
			.setLabel('Use type- INCOMEROLE or STATBOOST')
			.setValue(itemUseType)
			.setStyle(TextInputStyle.Short);
		
		const itemGivesInput = new TextInputBuilder()
			.setCustomId('itemgives')
			.setLabel('What exactly does using this item give?')
			.setValue(itemGives)
			.setStyle(TextInputStyle.Short);

		let itemTakesInput;
		if (itemTakes != "") {
			itemTakesInput = new TextInputBuilder()
				.setCustomId('itemtakes')
				.setLabel('What does using this item take? (Optional)')
				.setValue(itemTakes)
				.setRequired(false)
				.setStyle(TextInputStyle.Paragraph);
		}

		let itemCountdownInput;
		if (itemCountdownHours != "") {
			itemCountdownInput = new TextInputBuilder()
				.setCustomId('itemcountdown')
				.setLabel('Usage cooldown in hours (Optional)')
				.setValue(String(itemCountdownHours))
				.setRequired(false)
				.setStyle(TextInputStyle.Short);
		}

		const nameActionRow = new ActionRowBuilder().addComponents(itemNameInput);
		const useTypeActionRow = new ActionRowBuilder().addComponents(itemUseTypeInput);
		const givesActionRow = new ActionRowBuilder().addComponents(itemGivesInput);
		let takesActionRow;
		let countdownActionRow;
		if (itemTakes != "") {
			takesActionRow = new ActionRowBuilder().addComponents(itemTakesInput);
		}
		if (itemCountdownHours != "") {
			countdownActionRow = new ActionRowBuilder().addComponents(itemCountdownInput);
		}

		// Add the action rows to the modal
		if (takesActionRow && countdownActionRow) {
			modal.addComponents(nameActionRow, useTypeActionRow, givesActionRow, takesActionRow, countdownActionRow);
		} else if (takesActionRow) {
			modal.addComponents(nameActionRow, useTypeActionRow, givesActionRow, takesActionRow);
		} else if (countdownActionRow) {
			modal.addComponents(nameActionRow, useTypeActionRow, givesActionRow, countdownActionRow);
		} else {
			modal.addComponents(nameActionRow, useTypeActionRow, givesActionRow);
		}

		// Show the modal to the user
		await interaction.showModal(modal);
	},
};
