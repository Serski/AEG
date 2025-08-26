const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config');
const fs = require('node:fs');
const path = require('node:path');
const dbm = require('./database-manager');
const { map } = require('./admin');


async function loadCommands() {
        const commands = [];
        const foldersPath = path.join(__dirname, 'commands');
        const entries = fs.readdirSync(foldersPath, { withFileTypes: true });

        for (const entry of entries) {
                if (entry.isDirectory()) {
                        const commandsPath = path.join(foldersPath, entry.name);
                        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                        for (const file of commandFiles) {
                                const filePath = path.join(commandsPath, file);
                                const command = require(filePath);
                                if ('data' in command && 'execute' in command) {
                                        commands.push(command.data.toJSON());
                                } else {
                                        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                                }
                        }
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                        const filePath = path.join(foldersPath, entry.name);
                        const command = require(filePath);
                        if ('data' in command && 'execute' in command) {
                                commands.push(command.data.toJSON());
                        } else {
                                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        }
                }
        }

	// dbm.saveFile('keys', 'commandList', commandList, (err, result) => {
	//     if (err) {
	//         console.error('Failed to save command list:', err);
	//     } else {
	//         console.log('Command list saved successfully:', result);
	//     }
	// });

	//Also save commandList to a local json
	// fs.writeFileSync('commandList.json', JSON.stringify(commandList, null, 2));

	// Construct and prepare an instance of the REST module
        const rest = new REST().setToken(token);

	// and deploy your commands!
	(async () => {
		
			console.log(`Started refreshing ${commands.length} application (/) commands.`);

                        // The put method is used to fully refresh all commands in the guild with the current set
                        const data = await rest.put(
                                Routes.applicationGuildCommands(clientId, guildId),
                                { body: commands },
                        );

			console.log(`Successfully reloaded ${data.length} application (/) commands.`);
		
	})();
}

loadCommands();

module.exports = { loadCommands };