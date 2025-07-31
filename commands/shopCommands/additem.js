//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shop = require('../../shop'); // Importing shop

module.exports = {
	data: new SlashCommandBuilder()
		.setName('additem')
		.setDescription('Add item to shop')
		.setDefaultMemberPermissions(0)
		.addStringOption(option => option.setName('itemname').setDescription('The name of the item').setRequired(true))
		.addStringOption(option => option.setName('itemicon').setDescription('The icon of the item').setRequired(true))
		.addStringOption(option => option.setName('itemdescription').setDescription('The description of the item').setRequired(true))
		.addStringOption(option => option.setName('itemcategory').setDescription('The category of the item').setRequired(true))
		.addStringOption(option => option.setName('itemprice').setDescription('The price of the item').setRequired(false)),
	async execute(interaction) {
		// Call the addItem function from the Shop class with the collected information
		if (parseInt(interaction.options.getString('itemprice'))) {
			shop.addItem(
				interaction.options.getString('itemname'), 
				{ 
					Icon: interaction.options.getString('itemicon'), 
					Price: parseInt(interaction.options.getString('itemprice')), 
					Description: interaction.options.getString('itemdescription'), 
					Category: interaction.options.getString('itemcategory'),
					"Transferrable (Y/N)": "Yes"
				}
			);
		} else {
			shop.addItem(
				interaction.options.getString('itemname'), 
				{ 
					Icon: interaction.options.getString('itemicon'), 
					Description: interaction.options.getString('itemdescription'), 
					Category: interaction.options.getString('itemcategory'),
					"Transferrable (Y/N)": "Yes"
				}
			);
		}

		// Show the modal to the user
		await interaction.reply(`Item '${interaction.options.getString('itemname')}' has been added to the item list. Edit it using /edititemmenu. Give it a price to add to shop.`);
	},
};
