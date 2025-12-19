const { token, clientId, guildId } = require('./config');
const Discord = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const interactionHandler = require('./interaction-handler')
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { getCharModule } = require('./charModule');
const char = getCharModule();
const dbm = require('./database-manager');
const admin = require('./admin');
const shop = require('./shop');
const marketplace = require('./marketplace');
// Preload frequently used key data
require('./keys');

if (process.env.AEG_GLOBAL_GUARDS !== 'false') {
    process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));
    process.on('uncaughtException', e => console.error('[uncaughtException]', e));
}
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

//sets up usage of commands from command folder
client.commands = new Collection();
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
                                client.commands.set(command.data.name, command);
                        } else {
                                if (process.env.DEBUG) console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        }
                }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
                const filePath = path.join(foldersPath, entry.name);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                } else {
                        if (process.env.DEBUG) console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
        }
}

client.once(Events.ClientReady, async () => {
    if (process.env.DEBUG) console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot ready, loading marketplace cache…');
    await marketplace.loadMarketplace();
    console.log('Marketplace cache loaded');

    const preloadChars = (process.env.PRELOAD_CHAR_IDS || '').split(',').filter(Boolean);

    // Load remaining collections in parallel
    const [shopData] = await Promise.all([
        shop.getShopData(),
        dbm.loadCollection('keys'),
        dbm.loadCollection('recipes'),
        ...preloadChars.map(id => char.findPlayerData(id.trim()))
    ]);

    // Share shop data cache across modules
    marketplace.shopDataCache = shopData;

    if (process.env.AEG_WARMUP_TICK === 'true') {
        const interval = Number(process.env.AEG_WARMUP_INTERVAL_MS) || 600000;
        setInterval(async () => {
            try {
                await Promise.all([marketplace.loadMarketplace(), shop.getShopData()]);
            } catch (err) { console.error('warmup tick error', err); }
        }, interval);
    }
});

// //message handler
// client.on('messageCreate', async message => {
//     if (message.author.bot) return;

//     // Check for =say, if found send the message coming after =say and a space using char.say. If returned message is not Message sent! then send the returned message.
//     if (message.content.startsWith('=say')) {
// 		const msg = message.content.slice(4);
// 		let reply = await char.say(message.author.tag, msg, message.channel);
// 		if (reply != "Message sent!") {
// 			message.channel.send(reply);
// 		}

// 		//Delete message
// 		message.delete();
//     }
// });


client.on(Events.MessageCreate, async message => {
        // Ignore direct messages entirely to prevent bypassing permission checks
        if (!message.guild) {
                return;
        }
});

//interaction handler
client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.inGuild()) {
                if (interaction.isRepliable()) {
                        const payload = { content: 'Commands can only be used within a server.', flags: 64 };
                        if (interaction.deferred || interaction.replied) {
                                await interaction.followUp(payload);
                        } else {
                                await interaction.reply(payload);
                        }
                }
                return;
        }

        //Ignore a specific user with id 614966892486197259

        if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);

                try {
                        await command.execute(interaction);
                } catch (error) {
                        console.error("THIS IS THE ERROR: " + error);
                        console.error(error);
                        console.error("BELOW IS THE REST OF THINGS");
                        if (interaction.replied || interaction.deferred) {
                                await interaction.followUp({ content: 'There was an error while executing this command!', flags: 64 });
                        } else {
                                await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
                        }
                }
        } else {
                interactionHandler.handle(interaction);
        }
});

client.on('guildMemberAdd', member => {
    const memberBio = "A new member of Britannia!";
    char.newChar(member.id, member.user.tag, memberBio, member.id);
});

client.on('guildMemberRemove', member => {
    let memberID = member.id;
    if (process.env.DEBUG) console.log("Member ID: " + memberID);
});

//For commands that need to be run daily, and daily logging of infos and such
function botMidnightLoop() {
	var now = new Date();
        if (process.env.DEBUG) console.log(now);

	var msToMidnight = (24 * 60 * 60 * 1000) 
		- ((now.getUTCHours()) * 60 * 60 * 1000) 
		- ((now.getUTCMinutes()) * 60 * 1000) 
		- ((now.getUTCSeconds()) * 1000)
		- ((now.getUTCMilliseconds()));
	setTimeout(function() {
		char.resetIncomeCD();
		dbm.logData();
		botMidnightLoop();
	}, msToMidnight);
        if (process.env.DEBUG) console.log(msToMidnight);
}
botMidnightLoop();

client.login(token);

function getClient() {
	return client;
}

function getGuildID() {
        return guildId;
}

module.exports = { getClient, getGuildID };
