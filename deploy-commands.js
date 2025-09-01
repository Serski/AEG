const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;


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
                                        if (process.env.DEBUG) console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                                }
                        }
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                        const filePath = path.join(foldersPath, entry.name);
                        const command = require(filePath);
                        if ('data' in command && 'execute' in command) {
                                commands.push(command.data.toJSON());
                        } else {
                                if (process.env.DEBUG) console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        }
                }
        }

        //Also save commandList to a local json
        // fs.writeFileSync('commandList.json', JSON.stringify(commandList, null, 2));

	// Construct and prepare an instance of the REST module
        const rest = new REST().setToken(token);

        // and deploy your commands!
        try {
                if (process.env.DEBUG) console.log(`Started refreshing ${commands.length} application (/) commands.`);

                // The put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                        Routes.applicationGuildCommands(clientId, guildId),
                        { body: commands },
                );

                if (process.env.DEBUG) console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
                console.error('Error reloading application (/) commands:', error);
        }
}

loadCommands().catch(err => console.error('Unexpected error while loading commands:', err));

module.exports = { loadCommands };
