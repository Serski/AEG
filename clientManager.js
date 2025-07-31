class clientManager {
    static getEmoji(emojiName) {
        const bot = require('./bot');

        //Remove spaces
        emojiName = emojiName.replace(/\s/g, '');
        const client = bot.getClient();
        const guildID = bot.getGuildID();
        if (!client) {
            console.log("Client not found")
            return null;
        }
        const guild = client.guilds.cache.get(guildID);
        if (!guild) {
            console.log("Guild not found")
            return null;
        }
        const foundEmoji = guild.emojis.cache?.find(emoji => emoji.name.toLowerCase() === emojiName.toLowerCase());
        if (!foundEmoji) {
            console.log("Emoji not found")
            return null;
        }
        return `<:${foundEmoji.name}:${foundEmoji.id}>`;
    }

    static async getUser(userID) {
        const bot = require('./bot');
        const client = bot.getClient();
        const guildID = bot.getGuildID();
        const guild = client.guilds.cache.get(guildID);
        if (!guild) {
            console.log("Guild not found")
            return null;
        }
        const foundUser = await guild.members.fetch(userID);
        if (!foundUser) {
            console.log("User not found")
            return null;
        }
        return foundUser;
    }
    
}

module.exports = clientManager;