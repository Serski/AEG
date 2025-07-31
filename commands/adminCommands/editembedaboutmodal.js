const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const dbm = require ('../../database-manager');

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('editembedabout')
        .setDescription('Edit the about field of an embed. Use /editembedmenu first. Allows you to type paragraphs.')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            let mapName = await dbm.loadFile('characters', interaction.user.tag);   
            
            mapName = mapName.editingFields["Map Edited"];
            let mapTypeEdited = mapName.editingFields["Map Type Edited"];
            
            let maps = await dbm.loadFile('keys', mapTypeEdited);

            let mapAbout = maps[mapName].mapOptions.about;
            if (mapAbout == null || mapAbout == undefined) {
                mapAbout = "Type input here";
            }

            let mapNameNoSpaces = mapName.replace(/ /g, '').toLowerCase();

            const modal = new ModalBuilder()
                .setCustomId('editmapaboutmodal' + mapNameNoSpaces + "||" + mapTypeEdited)
                .setTitle('Edit the About Section of [' + mapName + ']');

            const mapAboutInput = new TextInputBuilder()
                .setCustomId('mapabout')
                .setLabel('About Section')
                .setPlaceholder('Type the new about section here')
                .setValue(mapAbout ? mapAbout : "Type input here")
                .setStyle(TextInputStyle.Paragraph);

            const aboutActionRow = new ActionRowBuilder().addComponents(mapAboutInput);

            // Add the action rows to the modal
            modal.addComponents(aboutActionRow);

            // Show the modal to the user
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error executing editmapabout command:', error);
        }
    }
};