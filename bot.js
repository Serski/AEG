const {clientId, guildId, token} = require('./config.json');
const Discord = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const interactionHandler = require('./interaction-handler')
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const char = require('./char');
const dbm = require('./database-manager');
const admin = require('./admin');
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
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
	//client.user.setAvatar('https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&');
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

//interaction handler
client.on(Events.InteractionCreate, async interaction => {
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
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	} else {
		interactionHandler.handle(interaction);
	}
});

client.on('guildMemberAdd', member => {
    // Assuming 'newchar' is a function you've defined to handle the new character creation
	let memberID = member.id;
	let memberName = member.user.tag;
	let memberBio = "A new member of Britannia!";
	char.newChar(memberName, memberName, memberBio, memberID);
});

client.on('guildMemberRemove', member => {
	let memberID = member.id;
	console.log("Member ID: " + memberID);
});

client.on('userUpdate', (oldMember, newMember) => {
	// Since data in Characters is stored by tag, we need to update the username in the database when a user changes their username
	let oldName = oldMember.tag;
	let newName = newMember.tag;

	oldData = dbm.loadFile('characters', oldName);
	if (oldData) {
		dbm.saveFile('characters', newName, oldData);
		dbm.docDelete('characters', oldName);
	}
});

//For commands that need to be run daily, and daily logging of infos and such
function botMidnightLoop() {
	var now = new Date();
	console.log(now);

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
	console.log(msToMidnight);
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

// process.on('uncaughtException', function (err){ 
// 	const channelID = "1249834768326197379";
// 	console.log('Caught exception: ' + err);
// 	try {
// 		console.log("Major error!")
// 	} catch (error) {
// 		//Log full error to console
// 		console.error(error);
// 	}
// });