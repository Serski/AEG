// const { SlashCommandBuilder } = require('discord.js');
// const admin = require('../../admin'); // Importing the database manager

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('addshire')
// 		.setDescription('Add a shire')
// 		.setDefaultMemberPermissions(0)
//         .addStringOption(option =>
//             option.setName('shire')
//                 .setDescription('The name of the city')
//                 .setRequired(true))
//         .addStringOption(option =>
//             option.setName('resource')
//                 .setDescription('The name of the resource produced')
//                 .setRequired(true)),
// 	async execute(interaction) {
// 		try {
//             let shire = interaction.options.getString('shire');
//             let resource = interaction.options.getString('resource');
//             let guild = interaction.guild;
//             // Call the method with the channel object directly
//             let reply = await admin.addShire(shire, resource, guild);
//             if (reply == "Shire already exists") {
//                 await interaction.reply({ content: "Shire " + shire + " already exists", ephemeral: true });
//             } else if (reply != null) {
//                 await interaction.reply({ content: reply, ephemeral: false });
//             } else {
//                 await interaction.reply({ content: "An error has arisen", ephemeral: true });
//             }
//         } catch (error) {
//             console.error("Failed to initialize select menu:", error);
//             await interaction.reply({ content: "Failed to set the select menu. Please try again.", ephemeral: true });
//         }
// 	},
// };