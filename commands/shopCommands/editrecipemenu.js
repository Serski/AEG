const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editrecipemenu')
		.setDescription('Show the edit recipe menu')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('recipename')
			.setDescription('The recipe name')
			.setRequired(true)
		),
	async execute(interaction) {
	        await interaction.deferReply({ flags: 64 });
                const recipeName = interaction.options.getString('recipename');

                (async () => {
                        //shop.editrecipeMenu returns an array with the first element being the replyEmbed and the second element being the rows
                        const numericID = interaction.user.id;
                        let reply = await shop.editRecipeMenu(recipeName, String(numericID));
                        if (typeof(reply) == 'string') {
                            await interaction.editReply(reply);
                        } else {
                            await interaction.editReply({ embeds: [reply]});
                        }
		})()
	},
};